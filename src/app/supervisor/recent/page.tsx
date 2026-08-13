import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import RecentClient from './RecentClient';

export default async function SupervisorRecentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  const [{ data: entries }, { data: rates }, workers, machines] = await Promise.all([
    supabase
      .from('production_entries')
      .select(`
        id, production_date, entry_date, meters_produced, rate_applied, amount,
        entered_by,
        workers!inner(id, name),
        machines!inner(id, machine_number)
      `)
      .eq('entered_by', user?.id || '')
      .eq('is_deleted', false)
      .order('entry_date', { ascending: false })
      .limit(100),
    supabase
      .from('machine_rates')
      .select('machine_id, rate_per_meter')
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`),
    getWorkers(true),
    getMachines(true),
  ]);

  const rateMap = new Map<string, number>();
  rates?.forEach(r => rateMap.set(r.machine_id, Number(r.rate_per_meter)));

  const serialized = (entries || []).map(e => ({
    id: e.id,
    productionDate: e.production_date,
    entryDate: e.entry_date,
    meters: String(e.meters_produced),
    ratePerMeter: String(e.rate_applied),
    amount: String(e.amount),
    worker: { id: (e.workers as any)?.id || '', name: (e.workers as any)?.name || '' },
    machine: { id: (e.machines as any)?.id || '', machineNumber: (e.machines as any)?.machine_number || '' },
    enteredBy: e.entered_by,
  }));

  const machinesWithRate = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
    currentRatePerMeter: rateMap.get(m.id) || 0,
  }));

  return (
    <RecentClient
      initialEntries={serialized}
      currentUserId={user?.id || ''}
      workers={workers.map(w => ({ id: w.id, name: w.name }))}
      machines={machinesWithRate}
    />
  );
}
