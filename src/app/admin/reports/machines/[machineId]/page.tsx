import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';
import { notFound } from 'next/navigation';
import MachineDetailClient from './MachineDetailClient';

export default async function MachineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ machineId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { machineId } = await params;
  const sp = await searchParams;
  const startDate = sp.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const endDate = sp.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const supabase = await createClient();

  // Get machine info
  const { data: machine } = await supabase
    .from('machines')
    .select('id, machine_number, name, active')
    .eq('id', machineId)
    .single();

  if (!machine) notFound();

  // Get all production entries for this machine in the date range
  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      id,
      production_date,
      meters_produced,
      rate_applied,
      amount,
      workers(id, name)
    `)
    .eq('machine_id', machineId)
    .gte('production_date', startDate)
    .lte('production_date', endDate)
    .eq('is_deleted', false)
    .order('production_date', { ascending: false });

  const serialized = (entries || []).map((e: any) => ({
    id: e.id,
    productionDate: e.production_date,
    metersProduced: Number(e.meters_produced),
    rateApplied: Number(e.rate_applied),
    amount: Number(e.amount),
    workerName: e.workers?.name || '—',
  }));

  return (
    <MachineDetailClient
      key={machineId + '_' + startDate + '_' + endDate}
      machineId={machineId}
      machineNumber={machine.machine_number}
      machineName={machine.name || ''}
      entries={serialized}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
