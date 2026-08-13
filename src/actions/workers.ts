'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';
import type { Worker, WorkerInsert, WorkerUpdate } from '@/lib/types/database';

export async function getWorkers(activeOnly: boolean = false): Promise<Worker[]> {
  const supabase = await createClient();
  let query = supabase.from('workers').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Worker[];
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Worker;
}

export async function createWorker(params: Omit<WorkerInsert, 'active'>): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workers')
    .insert({ ...params, active: true })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'worker',
    entityId: data!.id,
    newValue: params as Record<string, unknown>,
  });

  revalidatePath('/admin/workers');
  return { id: data!.id };
}

export async function updateWorker(id: string, updates: WorkerUpdate): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  // Get old values for audit
  const { data: old } = await supabase.from('workers').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'update',
    entityType: 'worker',
    entityId: id,
    oldValue: old as Record<string, unknown>,
    newValue: updates as Record<string, unknown>,
  });

  revalidatePath('/admin/workers');
  revalidatePath(`/admin/workers/${id}`);
  return {};
}

export async function toggleWorkerActive(id: string, active: boolean): Promise<{ error?: string }> {
  return updateWorker(id, { active });
}

export async function deleteWorker(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Get old values for audit
  const { data: old } = await supabase.from('workers').select('*').eq('id', id).single();

  if (old) {
    const tables = [
      { name: 'worker_advances', label: 'Advances' },
      { name: 'payment_adjustments', label: 'Payment Adjustments' },
      { name: 'payment_history', label: 'Payment History' },
      { name: 'payroll_record_lines', label: 'Payroll Lines' },
      { name: 'payroll_records', label: 'Payroll Records' },
      { name: 'production_entries', label: 'Production Entries' },
    ];

    for (const table of tables) {
      const { error: delErr } = await adminSupabase.from(table.name).delete().eq('worker_id', id);
      if (delErr) {
        return { error: `Cannot delete worker. Failed to delete associated ${table.label}: ${delErr.message}` };
      }
    }
  }

  // 7. Finally delete the worker
  const { error } = await adminSupabase.from('workers').delete().eq('id', id);

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'delete',
    entityType: 'worker',
    entityId: id,
    oldValue: old as Record<string, unknown>,
  });

  revalidatePath('/admin/workers');
  return {};
}

export async function getWorkerStats(workerId: string) {
  const supabase = await createClient();

  // Total meters produced
  const { data: metersData } = await supabase
    .from('production_entries')
    .select('meters_produced')
    .eq('worker_id', workerId)
    .eq('is_deleted', false);

  const totalMeters = metersData?.reduce((sum, e) => sum + Number(e.meters_produced), 0) || 0;

  // Pending advances
  const { data: advancesData } = await supabase
    .from('worker_advances')
    .select('amount')
    .eq('worker_id', workerId)
    .eq('status', 'pending');

  const pendingAdvances = advancesData?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;

  // Total earnings (paid)
  const { data: paymentsData } = await supabase
    .from('payment_history')
    .select('amount_paid')
    .eq('worker_id', workerId);

  const totalEarnings = paymentsData?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

  return { totalMeters, pendingAdvances, totalEarnings };
}
