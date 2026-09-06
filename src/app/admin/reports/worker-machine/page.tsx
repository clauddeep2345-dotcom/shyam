import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import { subDays } from 'date-fns';
import WorkerMachineReportClient, { type ReportEntry } from './WorkerMachineReportClient';

export default async function WorkerMachineReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    workerId?: string;
    machineId?: string;
    shift?: string;
    start?: string;
    end?: string;
  }>;
}) {
  const sp = await searchParams;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const defaultStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const startDate = sp.start || defaultStart;
  const endDate = sp.end || today;
  const workerId = sp.workerId || '';
  const machineId = sp.machineId || '';
  const shift = sp.shift || '';

  const supabase = await createClient();

  let query = supabase
    .from('production_entries')
    .select(`
      id,
      production_date,
      shift,
      entry_date,
      meters_produced,
      worker_id,
      machine_id,
      workers(id, name),
      machines(id, machine_number)
    `)
    .gte('production_date', startDate)
    .lte('production_date', endDate)
    .eq('is_deleted', false)
    .order('production_date', { ascending: false });

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }
  if (machineId) {
    query = query.eq('machine_id', machineId);
  }
  if (shift) {
    query = query.eq('shift', shift);
  }

  const [workers, machines, { data: entries }] = await Promise.all([
    getWorkers(false),
    getMachines(false),
    query,
  ]);

  const serialized: ReportEntry[] = (entries || []).map((e: any) => ({
    id: e.id,
    productionDate: e.production_date,
    shift: (e.shift as 'day' | 'night') || 'day',
    entryDate: e.entry_date,
    metersProduced: Number(e.meters_produced),
    workerId: e.worker_id,
    workerName: e.workers?.name || 'Unknown Worker',
    machineId: e.machine_id,
    machineNumber: e.machines?.machine_number || '—',
  }));

  return (
    <WorkerMachineReportClient
      key={`${workerId}_${machineId}_${shift}_${startDate}_${endDate}`}
      initialEntries={serialized}
      workers={workers.map(w => ({ id: w.id, name: w.name, active: w.active }))}
      machines={machines.map(m => ({ id: m.id, machineNumber: m.machine_number, active: m.active }))}
      selectedWorkerId={workerId}
      selectedMachineId={machineId}
      selectedShift={shift}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
