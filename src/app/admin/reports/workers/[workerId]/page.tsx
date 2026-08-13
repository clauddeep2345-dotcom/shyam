import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import WorkerDetailClient from './WorkerDetailClient';

export default async function WorkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { workerId } = await params;
  const sp = await searchParams;
  const startDate = sp.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const endDate = sp.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const supabase = await createClient();

  // Get worker info
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, active')
    .eq('id', workerId)
    .single();

  if (!worker) notFound();

  // Get all production entries for this worker in the date range
  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      id,
      production_date,
      meters_produced,
      rate_applied,
      amount,
      machines(id, machine_number, name)
    `)
    .eq('worker_id', workerId)
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
    machineNumber: e.machines?.machine_number || '—',
    machineName: e.machines?.name || '',
  }));

  return (
    <WorkerDetailClient
      key={workerId + '_' + startDate + '_' + endDate}
      workerId={workerId}
      workerName={worker.name}
      entries={serialized}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
