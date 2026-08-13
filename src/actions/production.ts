'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';
import { lookupRate } from '@/lib/business-logic/rate-lookup';
import type { ProductionEntryWithDetails } from '@/lib/types/database';

export async function createProductionEntry(params: {
  workerId: string;
  machineId: string;
  metersProduced: number;
  productionDate: string;
  notes?: string;
}): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  // Validate production date is not in the future
  const today = new Date().toISOString().split('T')[0];
  if (params.productionDate > today) {
    return { error: 'Production date cannot be in the future.' };
  }

  // Look up the rate effective on the production date
  const rate = await lookupRate(params.machineId, params.productionDate);
  if (rate === null) {
    return { error: `No rate found for this machine on ${params.productionDate}. Please set a rate first.` };
  }

  const amount = Math.round(params.metersProduced * rate * 100) / 100;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('production_entries')
    .insert({
      worker_id: params.workerId,
      machine_id: params.machineId,
      meters_produced: params.metersProduced,
      production_date: params.productionDate,
      entry_date: today,
      rate_applied: rate,
      amount,
      entered_by: user.id,
      notes: params.notes || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'entry',
    entityId: data!.id,
    newValue: { ...params, rate_applied: rate, amount },
  });

  revalidatePath('/admin/production');
  revalidatePath('/supervisor/history');
  return { id: data!.id };
}

export async function updateProductionEntry(
  id: string,
  params: {
    workerId?: string;
    machineId?: string;
    metersProduced?: number;
    productionDate?: string;
    notes?: string;
  }
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const supabase = await createClient();

  // Get existing entry
  const { data: existing } = await supabase
    .from('production_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) return { error: 'Entry not found.' };

  // Supervisors can only edit their own same-day entries
  if (user.role === 'supervisor') {
    if (existing.entered_by !== user.id) return { error: 'You can only edit your own entries.' };
    const today = new Date().toISOString().split('T')[0];
    if (existing.entry_date !== today) {
      return { error: 'You can only edit entries made today. Contact Admin.' };
    }
  }

  // If production_date or machine changed, re-lookup rate
  const machineId = params.machineId || existing.machine_id;
  const productionDate = params.productionDate || existing.production_date;
  const metersProduced = params.metersProduced ?? Number(existing.meters_produced);

  let rateApplied = Number(existing.rate_applied);
  if (params.productionDate || params.machineId) {
    const newRate = await lookupRate(machineId, productionDate);
    if (newRate === null) {
      return { error: `No rate found for this machine on ${productionDate}.` };
    }
    rateApplied = newRate;
  }

  const amount = Math.round(metersProduced * rateApplied * 100) / 100;

  const { error } = await supabase
    .from('production_entries')
    .update({
      worker_id: params.workerId || existing.worker_id,
      machine_id: machineId,
      meters_produced: metersProduced,
      production_date: productionDate,
      rate_applied: rateApplied,
      amount,
      notes: params.notes !== undefined ? params.notes : existing.notes,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'update',
    entityType: 'entry',
    entityId: id,
    oldValue: existing as Record<string, unknown>,
    newValue: { ...params, rate_applied: rateApplied, amount },
  });

  revalidatePath('/admin/production');
  revalidatePath('/supervisor/history');
  return {};
}

export async function softDeleteProductionEntry(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('production_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) return { error: 'Entry not found.' };

  // Supervisors: same-day only
  if (user.role === 'supervisor') {
    if (existing.entered_by !== user.id) return { error: 'You can only delete your own entries.' };
    const today = new Date().toISOString().split('T')[0];
    if (existing.entry_date !== today) {
      return { error: 'You can only delete entries made today. Contact Admin.' };
    }
  }

  const { error } = await supabase
    .from('production_entries')
    .update({
      is_deleted: true,
      deleted_by: user.id,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'delete',
    entityType: 'entry',
    entityId: id,
    oldValue: existing as Record<string, unknown>,
  });

  revalidatePath('/admin/production');
  revalidatePath('/supervisor/history');
  return {};
}

export async function getProductionEntries(params?: {
  workerId?: string;
  machineId?: string;
  enteredBy?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}): Promise<ProductionEntryWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from('production_entries')
    .select(`
      *,
      workers!inner(id, name),
      machines!inner(id, machine_number, name),
      users!production_entries_entered_by_fkey(id, name)
    `)
    .order('production_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (!params?.includeDeleted) {
    query = query.eq('is_deleted', false);
  }
  if (params?.workerId) query = query.eq('worker_id', params.workerId);
  if (params?.machineId) query = query.eq('machine_id', params.machineId);
  if (params?.enteredBy) query = query.eq('entered_by', params.enteredBy);
  if (params?.startDate) query = query.gte('production_date', params.startDate);
  if (params?.endDate) query = query.lte('production_date', params.endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((entry) => ({
    ...entry,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker: entry.workers as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    machine: entry.machines as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entered_by_user: entry.users as any,
  })) as unknown as ProductionEntryWithDetails[];
}
