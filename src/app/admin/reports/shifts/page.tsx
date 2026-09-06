import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';
import ShiftReportClient, { type MachineShiftStat } from './ShiftReportClient';

export default async function ShiftReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const defaultStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const startDate = sp.start || defaultStart;
  const endDate = sp.end || today;

  const supabase = await createClient();

  const [entriesRes, machinesRes] = await Promise.all([
    supabase
      .from('production_entries')
      .select(`
        id,
        production_date,
        shift,
        meters_produced,
        machine_id,
        machines(id, machine_number)
      `)
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .eq('is_deleted', false),
    supabase
      .from('machines')
      .select('id, machine_number, active')
      .order('machine_number', { ascending: true }),
  ]);

  const entries = entriesRes.data || [];
  const machines = machinesRes.data || [];

  // Group by machine
  const machineMap = new Map<string, MachineShiftStat>();

  // Initialize with all machines
  for (const m of machines) {
    machineMap.set(m.id, {
      machineId: m.id,
      machineNumber: m.machine_number,
      active: m.active ?? true,
      dayMeters: 0,
      dayRuns: 0,
      nightMeters: 0,
      nightRuns: 0,
      totalMeters: 0,
      totalRuns: 0,
    });
  }

  let totalDayMeters = 0;
  let totalDayRuns = 0;
  let totalNightMeters = 0;
  let totalNightRuns = 0;

  for (const e of entries) {
    const m = Number(e.meters_produced) || 0;
    const shift = (e.shift as string) === 'night' ? 'night' : 'day';
    const mId = e.machine_id;

    if (shift === 'night') {
      totalNightMeters += m;
      totalNightRuns += 1;
    } else {
      totalDayMeters += m;
      totalDayRuns += 1;
    }

    if (mId) {
      const stat = machineMap.get(mId) || {
        machineId: mId,
        machineNumber: (e.machines as any)?.machine_number || '—',
        active: true,
        dayMeters: 0,
        dayRuns: 0,
        nightMeters: 0,
        nightRuns: 0,
        totalMeters: 0,
        totalRuns: 0,
      };

      if (shift === 'night') {
        stat.nightMeters += m;
        stat.nightRuns += 1;
      } else {
        stat.dayMeters += m;
        stat.dayRuns += 1;
      }

      stat.totalMeters = stat.dayMeters + stat.nightMeters;
      stat.totalRuns = stat.dayRuns + stat.nightRuns;
      machineMap.set(mId, stat);
    }
  }

  // Filter machines that have either totalRuns > 0 or are active
  const machineStats = Array.from(machineMap.values())
    .filter(m => m.totalRuns > 0 || m.active)
    .sort((a, b) => b.totalMeters - a.totalMeters);

  return (
    <ShiftReportClient
      key={`${startDate}_${endDate}`}
      machineStats={machineStats}
      totalDayMeters={totalDayMeters}
      totalDayRuns={totalDayRuns}
      totalNightMeters={totalNightMeters}
      totalNightRuns={totalNightRuns}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
