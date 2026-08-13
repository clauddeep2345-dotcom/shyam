'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';

export async function getAdvances(params?: {
  workerId?: string;
  status?: 'pending' | 'deducted' | 'cancelled';
}) {
  const supabase = await createClient();

  let query = supabase
    .from('worker_advances')
    .select('*, workers!inner(id, name), users!worker_advances_given_by_fkey(id, name)')
    .order('created_at', { ascending: false });

  if (params?.workerId) query = query.eq('worker_id', params.workerId);
  if (params?.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function giveAdvance(params: {
  workerId: string;
  amount: number;
  reason?: string;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('worker_advances')
    .insert({
      worker_id: params.workerId,
      amount: params.amount,
      advance_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
      reason: params.reason || null,
      given_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'advance',
    entityId: data!.id,
    newValue: params as Record<string, unknown>,
  });

  revalidatePath('/admin/advances');
  return {};
}

export async function cancelAdvance(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('worker_advances')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) return { error: 'Advance not found.' };
  if (existing.status !== 'pending') return { error: 'Only pending advances can be cancelled.' };

  const { error } = await supabase
    .from('worker_advances')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'update',
    entityType: 'advance',
    entityId: id,
    oldValue: { status: 'pending' },
    newValue: { status: 'cancelled' },
  });

  revalidatePath('/admin/advances');
  return {};
}
