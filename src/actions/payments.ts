'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';

export async function getPaymentHistory(params?: {
  workerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('payment_history')
    .select(`
      *,
      workers!inner(id, name),
      users!payment_history_paid_by_fkey(id, name),
      payroll_records!inner(
        id, payroll_period_id,
        payroll_periods!inner(period_start, period_end)
      ),
      payment_adjustments(*)
    `)
    .order('created_at', { ascending: false });

  if (params?.workerId) query = query.eq('worker_id', params.workerId);
  if (params?.startDate) query = query.gte('payment_date', params.startDate);
  if (params?.endDate) query = query.lte('payment_date', params.endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addPaymentAdjustment(params: {
  paymentHistoryId: string;
  workerId: string;
  adjustmentAmount: number;
  reason: string;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_adjustments')
    .insert({
      payment_history_id: params.paymentHistoryId,
      worker_id: params.workerId,
      adjustment_amount: params.adjustmentAmount,
      reason: params.reason,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'adjust',
    entityType: 'payment',
    entityId: data!.id,
    newValue: params as Record<string, unknown>,
  });

  revalidatePath('/admin/payments');
  return {};
}
