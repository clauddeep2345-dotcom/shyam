import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';
import MachineReportClient from './MachineReportClient';

export default async function MachineReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const startDate = params.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const endDate = params.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('production_entries')
    .select(`
      meters_produced,
      amount,
      machines!inner(id, machine_number, name)
    `)
    .gte('production_date', startDate)
    .lte('production_date', endDate)
    .eq('is_deleted', false);

  // Group by machine
  const machineMap = new Map<string, { id: string; machineNumber: string; name: string; totalMeters: number; totalAmount: number; entries: number }>();
  (entries || []).forEach((e: any) => {
    const machineId = e.machines.id;
    const existing = machineMap.get(machineId);
    if (existing) {
      existing.totalMeters += Number(e.meters_produced);
      existing.totalAmount += Number(e.amount);
      existing.entries += 1;
    } else {
      machineMap.set(machineId, {
        id: machineId,
        machineNumber: e.machines.machine_number,
        name: e.machines.name || '',
        totalMeters: Number(e.meters_produced),
        totalAmount: Number(e.amount),
        entries: 1,
      });
    }
  });

  const summary = Array.from(machineMap.values()).sort((a, b) => b.totalMeters - a.totalMeters);

  return (
    <MachineReportClient
      key={startDate + '_' + endDate}
      initialSummary={summary}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
