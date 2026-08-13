import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';
import WorkerReportClient from './WorkerReportClient';

export default async function WorkerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const startDate = params.start || subDays(new Date(), 30).toISOString().split('T')[0];
  const endDate = params.end || new Date().toISOString().split('T')[0];

  const supabase = await createClient();

  // Aggregate production by worker in the date range
  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      meters_produced,
      amount,
      workers!inner(id, name)
    `)
    .gte('production_date', startDate)
    .lte('production_date', endDate)
    .eq('is_deleted', false);

  // Group by worker
  const workerMap = new Map<string, { id: string; name: string; totalMeters: number; totalAmount: number; entries: number }>();
  (entries || []).forEach((e: any) => {
    const workerId = e.workers.id;
    const workerName = e.workers.name;
    const existing = workerMap.get(workerId);
    if (existing) {
      existing.totalMeters += Number(e.meters_produced);
      existing.totalAmount += Number(e.amount);
      existing.entries += 1;
    } else {
      workerMap.set(workerId, {
        id: workerId,
        name: workerName,
        totalMeters: Number(e.meters_produced),
        totalAmount: Number(e.amount),
        entries: 1,
      });
    }
  });

  const summary = Array.from(workerMap.values()).sort((a, b) => b.totalMeters - a.totalMeters);

  return (
    <WorkerReportClient
      key={startDate + '_' + endDate}
      initialSummary={summary}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
