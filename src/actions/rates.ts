'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';
import { validateRateNoOverlap } from '@/lib/business-logic/rate-lookup';

export async function setNewRate(params: {
  machineId: string;
  ratePerMeter: number;
  effectiveFrom: string;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  // Validate no overlap
  const overlapError = await validateRateNoOverlap(params.machineId, params.effectiveFrom);
  if (overlapError) return { error: overlapError };

  const supabase = await createClient();

  // Close previous active rate (set effective_to = day before new effective_from)
  const { data: previousRates } = await supabase
    .from('machine_rates')
    .select('id, rate_per_meter, effective_from')
    .eq('machine_id', params.machineId)
    .is('effective_to', null)
    .lt('effective_from', params.effectiveFrom);

  if (previousRates && previousRates.length > 0) {
    const prevDate = new Date(params.effectiveFrom);
    prevDate.setDate(prevDate.getDate() - 1);
    const closingDate = prevDate.toISOString().split('T')[0];

    for (const prev of previousRates) {
      await supabase
        .from('machine_rates')
        .update({ effective_to: closingDate })
        .eq('id', prev.id);
    }
  }

  // Insert new rate
  const { data: newRate, error } = await supabase
    .from('machine_rates')
    .insert({
      machine_id: params.machineId,
      rate_per_meter: params.ratePerMeter,
      effective_from: params.effectiveFrom,
      effective_to: null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'rate',
    entityId: newRate!.id,
    newValue: {
      machine_id: params.machineId,
      rate_per_meter: params.ratePerMeter,
      effective_from: params.effectiveFrom,
    },
  });

  revalidatePath('/admin/machines');
  revalidatePath(`/admin/machines/${params.machineId}`);
  return {};
}

export async function getRateHistory(machineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('machine_rates')
    .select('*, users!inner(name)')
    .eq('machine_id', machineId)
    .order('effective_from', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
