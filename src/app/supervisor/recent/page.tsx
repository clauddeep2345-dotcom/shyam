import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import RecentClient from './RecentClient';

export default async function SupervisorRecentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      id, production_date, entry_date, meters_produced, rate_applied, amount, shift,
      entered_by,
      workers!inner(id, name),
      machines!inner(id, machine_number)
    `)
    .eq('entered_by', user?.id || '')
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })
    .limit(100);

  const [workers, machines] = await Promise.all([
    getWorkers(true),
    getMachines(true),
  ]);

  const serialized = (entries || []).map(e => ({
    id: e.id,
    productionDate: e.production_date,
    entryDate: e.entry_date,
    meters: String(e.meters_produced),
    shift: ((e as any).shift as 'day' | 'night') || 'day',
    worker: { id: (e.workers as any)?.id || '', name: (e.workers as any)?.name || '' },
    machine: { id: (e.machines as any)?.id || '', machineNumber: (e.machines as any)?.machine_number || '' },
    enteredBy: e.entered_by,
  }));

  const simplifiedMachines = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
  }));

  return (
    <RecentClient
      initialEntries={serialized}
      currentUserId={user?.id || ''}
      workers={workers.map(w => ({ id: w.id, name: w.name }))}
      machines={simplifiedMachines}
    />
  );
}
