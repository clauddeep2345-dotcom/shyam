import React from 'react';
import { getProductionEntries } from '@/actions/production';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import ProductionListClient from '@/components/ProductionListClient';
import { subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';

export default async function AdminProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const startDate = params.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const endDate = params.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [entries, workers, machines] = await Promise.all([
    getProductionEntries({ startDate, endDate }),
    getWorkers(true),
    getMachines(true),
  ]);

  // Get current machine rates for edit modal
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const { data: rates } = await supabase
    .from('machine_rates')
    .select('machine_id, rate_per_meter')
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  const rateMap = new Map<string, number>();
  rates?.forEach(r => rateMap.set(r.machine_id, Number(r.rate_per_meter)));

  const serialized = entries.map(e => ({
    id: e.id,
    productionDate: e.production_date,
    entryDate: e.entry_date,
    meters: String(e.meters_produced),
    ratePerMeter: String(e.rate_applied),
    amount: String(e.amount),
    worker: { id: (e as any).workers?.id || '', name: (e as any).workers?.name || '' },
    machine: { id: (e as any).machines?.id || '', machineNumber: (e as any).machines?.machine_number || '' },
    enteredBy: e.entered_by,
  }));

  const machinesWithRate = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
    currentRatePerMeter: rateMap.get(m.id) || 0,
  }));

  return (
    <ProductionListClient
      initialEntries={serialized}
      title="Production Log"
      currentUserId={user?.id}
      currentUserRole="admin"
      workers={workers.map(w => ({ id: w.id, name: w.name }))}
      machines={machinesWithRate}
    />
  );
}
