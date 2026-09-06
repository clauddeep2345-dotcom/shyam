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
    .select('id, machine_number, active')
    .eq('id', machineId)
    .single();

  if (!machine) notFound();

  // Get all production entries for this machine in the date range
  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      id,
      production_date,
      shift,
      meters_produced,
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
    shift: (e.shift as 'day' | 'night') || 'day',
    metersProduced: Number(e.meters_produced),
    workerId: e.workers?.id || '',
    workerName: e.workers?.name || '—',
  }));

  return (
    <MachineDetailClient
      key={machineId + '_' + startDate + '_' + endDate}
      machineId={machineId}
      machineNumber={machine.machine_number}
      entries={serialized}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
