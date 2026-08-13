'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from './audit';
import { getCurrentUser } from './auth';
import type { Machine, MachineInsert, MachineUpdate, MachineRate } from '@/lib/types/database';

export async function getMachines(activeOnly: boolean = false): Promise<Machine[]> {
  const supabase = await createClient();
  let query = supabase.from('machines').select('*').order('machine_number');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  const machines = (data || []) as Machine[];
  machines.sort((a, b) => {
    const aNum = parseInt(a.machine_number, 10);
    const bNum = parseInt(b.machine_number, 10);
    if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    return a.machine_number.localeCompare(b.machine_number);
  });
  
  return machines;
}

export async function getMachineById(id: string): Promise<Machine | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('machines').select('*').eq('id', id).single();
  return data as Machine | null;
}

export async function getMachineWithRates(id: string): Promise<{
  machine: Machine;
  currentRate: number | null;
  rateHistory: MachineRate[];
} | null> {
  const supabase = await createClient();

  const { data: machine } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .single();

  if (!machine) return null;

  const { data: rates } = await supabase
    .from('machine_rates')
    .select('*')
    .eq('machine_id', id)
    .order('effective_from', { ascending: false });

  const rateHistory = (rates || []) as MachineRate[];
  const currentRate = rateHistory.find(r => !r.effective_to);

  return {
    machine: machine as Machine,
    currentRate: currentRate ? Number(currentRate.rate_per_meter) : null,
    rateHistory,
  };
}

export async function createMachine(params: Omit<MachineInsert, 'active'>): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('machines')
    .insert({ ...params, active: true })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'machine',
    entityId: data!.id,
    newValue: params as Record<string, unknown>,
  });

  revalidatePath('/admin/machines');
  return { id: data!.id };
}

export async function updateMachine(id: string, updates: MachineUpdate): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: old } = await supabase.from('machines').select('*').eq('id', id).single();

  const { error } = await supabase.from('machines').update(updates).eq('id', id);
  if (error) return { error: error.message };

  await writeAuditLog({
    userId: user.id,
    action: 'update',
    entityType: 'machine',
    entityId: id,
    oldValue: old as Record<string, unknown>,
    newValue: updates as Record<string, unknown>,
  });

  revalidatePath('/admin/machines');
  revalidatePath(`/admin/machines/${id}`);
  return {};
}

export async function getMachinesWithCurrentRate(): Promise<(Machine & { current_rate: number | null })[]> {
  const supabase = await createClient();

  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .order('machine_number');

  if (!machines) return [];

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const { data: rates } = await supabase
    .from('machine_rates')
    .select('machine_id, rate_per_meter')
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);

  const rateMap = new Map<string, number>();
  if (rates) {
    for (const r of rates) {
      rateMap.set(r.machine_id, Number(r.rate_per_meter));
    }
  }

  const result = (machines as Machine[]).map(m => ({
    ...m,
    current_rate: rateMap.get(m.id) ?? null,
  }));
  
  result.sort((a, b) => {
    const aNum = parseInt(a.machine_number, 10);
    const bNum = parseInt(b.machine_number, 10);
    if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    return a.machine_number.localeCompare(b.machine_number);
  });
  
  return result;
}
