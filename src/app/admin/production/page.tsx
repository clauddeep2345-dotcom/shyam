import React from 'react';
import { getProductionEntries } from '@/actions/production';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import ProductionListClient from '@/components/ProductionListClient';
import { subDays } from 'date-fns';

export default async function AdminProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const startDate = params.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const endDate = params.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const [entries, workers, machines] = await Promise.all([
    getProductionEntries({ startDate, endDate }),
    getWorkers(true),
    getMachines(true),
  ]);

  const serialized = entries.map(e => ({
    id: e.id,
    productionDate: e.production_date,
    shift: (e as any).shift || 'day',
    entryDate: e.entry_date,
    meters: String(e.meters_produced),
    worker: { id: (e as any).workers?.id || '', name: (e as any).workers?.name || '' },
    machine: { id: (e as any).machines?.id || '', machineNumber: (e as any).machines?.machine_number || '' },
    enteredBy: e.entered_by,
  }));

  const simplifiedMachines = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
  }));

  return (
    <ProductionListClient
      initialEntries={serialized}
      title="Production Log"
      currentUserRole="admin"
      workers={workers.map(w => ({ id: w.id, name: w.name }))}
      machines={simplifiedMachines}
    />
  );
}
