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

  const [{ data: worker }, { data: entries }] = await Promise.all([
    supabase
      .from('workers')
      .select('id, name, active')
      .eq('id', workerId)
      .single(),
    supabase
      .from('production_entries')
      .select(`
        id,
        production_date,
        shift,
        meters_produced,
        machines(id, machine_number)
      `)
      .eq('worker_id', workerId)
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .eq('is_deleted', false)
      .order('production_date', { ascending: false }),
  ]);

  if (!worker) notFound();

  const serialized = (entries || []).map((e: any) => ({
    id: e.id,
    productionDate: e.production_date,
    shift: (e.shift as 'day' | 'night') || 'day',
    metersProduced: Number(e.meters_produced),
    machineId: e.machines?.id || '',
    machineNumber: e.machines?.machine_number || '—',
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
