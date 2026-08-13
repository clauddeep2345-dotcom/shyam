'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';
import { calculatePayrollForPeriod } from '@/lib/business-logic/payroll-calculator';
import type { PayrollPeriod } from '@/lib/types/database';

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('period_start', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as PayrollPeriod[];
}

export async function getPayrollPeriodById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', id)
    .single();
  return data as PayrollPeriod | null;
}

export async function getPayrollRecordsForPeriod(periodId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      workers!inner(id, name, phone),
      payroll_record_lines(*, machines!inner(id, machine_number, name)),
      payment_history(*),
      payment_adjustments(*)
    `)
    .eq('payroll_period_id', periodId)
    .order('workers(name)');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function finalizePayroll(periodId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  // Check period status
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .single();

  if (!period) return { error: 'Period not found.' };
  if (period.status === 'finalized' || period.status === 'paid') {
    return { error: 'Period is already finalized.' };
  }

  // Calculate payroll
  const summaries = await calculatePayrollForPeriod(periodId);
  if (summaries.length === 0) return { error: 'No production entries found for this period.' };

  // Create payroll records and lines for each worker
  for (const summary of summaries) {
    // Upsert payroll record
    const { data: record, error: recordError } = await supabase
      .from('payroll_records')
      .upsert({
        payroll_period_id: periodId,
        worker_id: summary.worker_id,
        total_meters: summary.total_meters,
        total_amount: summary.total_amount,
        advance_deduction: summary.advance_deduction,
        net_amount: summary.net_amount,
        payment_status: 'pending',
        finalized_at: new Date().toISOString(),
        finalized_by: user.id,
      }, {
        onConflict: 'payroll_period_id,worker_id',
      })
      .select('id')
      .single();

    if (recordError) return { error: `Failed to create payroll record: ${recordError.message}` };

    // Delete old lines if any (from a previous finalization)
    await supabase
      .from('payroll_record_lines')
      .delete()
      .eq('payroll_record_id', record!.id);

    // Get production entries for this worker in this period
    const { data: periodData } = await supabase
      .from('payroll_periods')
      .select('period_start, period_end')
      .eq('id', periodId)
      .single();

    if (periodData) {
      const { data: entries } = await supabase
        .from('production_entries')
        .select('id, machine_id, meters_produced, rate_applied, amount')
        .eq('worker_id', summary.worker_id)
        .gte('production_date', periodData.period_start)
        .lte('production_date', periodData.period_end)
        .eq('is_deleted', false);

      if (entries) {
        const lines = entries.map(e => ({
          payroll_record_id: record!.id,
          worker_id: summary.worker_id,
          machine_id: e.machine_id,
          meters_produced: Number(e.meters_produced),
          rate_per_meter: Number(e.rate_applied),
          amount: Number(e.amount),
          production_entry_id: e.id,
        }));

        await supabase.from('payroll_record_lines').insert(lines);
      }
    }

    // Mark pending advances as deducted
    if (summary.advance_deduction > 0) {
      const { data: advances } = await supabase
        .from('worker_advances')
        .select('id')
        .eq('worker_id', summary.worker_id)
        .eq('status', 'pending');

      if (advances) {
        for (const adv of advances) {
          await supabase
            .from('worker_advances')
            .update({
              status: 'deducted',
              deducted_in_payroll_record_id: record!.id,
            })
            .eq('id', adv.id);
        }
      }
    }
  }

  // Update period status
  await supabase
    .from('payroll_periods')
    .update({ status: 'finalized' })
    .eq('id', periodId);

  await writeAuditLog({
    userId: user.id,
    action: 'finalize',
    entityType: 'payroll',
    entityId: periodId,
    newValue: { worker_count: summaries.length },
  });

  revalidatePath('/admin/payroll');
  revalidatePath(`/admin/payroll/${periodId}`);
  return {};
}

export async function reopenPayroll(periodId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .single();

  if (!period) return { error: 'Period not found.' };
  if (period.status === 'open' || period.status === 'reopened') {
    return { error: 'Period is already open.' };
  }

  // Set status to reopened — DO NOT delete payment_history
  await supabase
    .from('payroll_periods')
    .update({ status: 'reopened' })
    .eq('id', periodId);

  await writeAuditLog({
    userId: user.id,
    action: 'reopen',
    entityType: 'payroll',
    entityId: periodId,
  });

  revalidatePath('/admin/payroll');
  revalidatePath(`/admin/payroll/${periodId}`);
  return {};
}

export async function markPayrollPaid(
  periodId: string,
  payments: Array<{
    payrollRecordId: string;
    workerId: string;
    amountPaid: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'upi';
    notes?: string;
  }>
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  for (const payment of payments) {
    // Create payment_history record (immutable)
    await supabase.from('payment_history').insert({
      payroll_record_id: payment.payrollRecordId,
      worker_id: payment.workerId,
      amount_paid: payment.amountPaid,
      payment_date: new Date().toISOString().split('T')[0],
      paid_by: user.id,
      payment_method: payment.paymentMethod,
      notes: payment.notes || null,
    });

    // Update payroll record status
    await supabase
      .from('payroll_records')
      .update({
        payment_status: 'paid',
        paid_on: new Date().toISOString(),
        paid_by: user.id,
      })
      .eq('id', payment.payrollRecordId);
  }

  // Only mark period as 'paid' if ALL records in the period are now paid
  const { data: allRecords } = await supabase
    .from('payroll_records')
    .select('payment_status')
    .eq('payroll_period_id', periodId);

  const allPaid = allRecords && allRecords.length > 0 && allRecords.every(r => r.payment_status === 'paid');

  if (allPaid) {
    await supabase
      .from('payroll_periods')
      .update({ status: 'paid' })
      .eq('id', periodId);
  }

  await writeAuditLog({
    userId: user.id,
    action: 'pay',
    entityType: 'payroll',
    entityId: periodId,
    newValue: { payment_count: payments.length },
  });

  revalidatePath('/admin/payroll');
  revalidatePath('/admin/payments');
  return {};
}

/**
 * Preview payroll calculation without persisting (for Admin review before finalization).
 */
export async function previewPayroll(periodId: string) {
  return calculatePayrollForPeriod(periodId);
}
