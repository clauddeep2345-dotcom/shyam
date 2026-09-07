import { createClient } from '@/lib/supabase/server';
import { subDays, format } from 'date-fns';

export interface DashboardFleetMachine {
  id: string;
  machineNumber: string;
  isRunning: boolean;
  metersToday: number;
}

export interface DashboardDayTrend {
  date: string;
  dayLabel: string;
  dayMeters: number;
  nightMeters: number;
  totalMeters: number;
}

export interface DashboardStats {
  todayDateStr: string;
  todayTotal: number;
  todayEntriesCount: number;
  dayTotal: number;
  dayCount: number;
  nightTotal: number;
  nightCount: number;
  fleet: DashboardFleetMachine[];
  runningCount: number;
  idleCount: number;
  topWorkerToday?: {
    name: string;
    meters: number;
    machines: string[];
  };
  sevenDayTrend: DashboardDayTrend[];
}

export async function getLiveDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const sevenDaysAgoDate = subDays(now, 6);
  const sevenDaysAgoStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(sevenDaysAgoDate);

  // 1. Fetch active machines and entries for the last 7 days concurrently
  const [machinesRes, entriesRes] = await Promise.all([
    supabase
      .from('machines')
      .select('id, machine_number')
      .eq('active', true)
      .order('machine_number', { ascending: true }),
    supabase
      .from('production_entries')
      .select(`
        id,
        production_date,
        shift,
        meters_produced,
        machine_id,
        worker_id,
        workers(id, name),
        machines(id, machine_number)
      `)
      .gte('production_date', sevenDaysAgoStr)
      .lte('production_date', today)
      .eq('is_deleted', false),
  ]);

  const activeMachines = machinesRes.data || [];
  const entries = entriesRes.data || [];

  // Filter today's entries
  const todayEntries = entries.filter(e => e.production_date === today);

  let dayTotal = 0;
  let dayCount = 0;
  let nightTotal = 0;
  let nightCount = 0;

  // Machine activity today map
  const machineTodayMeters: Record<string, number> = {};
  // Worker today activity map
  const workerTodayMap: Record<string, { name: string; meters: number; machines: Set<string> }> = {};

  for (const e of todayEntries) {
    const m = Number(e.meters_produced) || 0;
    const shift = (e.shift as string) === 'night' ? 'night' : 'day';
    if (shift === 'night') {
      nightTotal += m;
      nightCount += 1;
    } else {
      dayTotal += m;
      dayCount += 1;
    }

    if (e.machine_id) {
      machineTodayMeters[e.machine_id] = (machineTodayMeters[e.machine_id] || 0) + m;
    }

    if (e.worker_id) {
      const workerName = (e.workers as any)?.name || 'Worker';
      const machNum = (e.machines as any)?.machine_number || '';
      if (!workerTodayMap[e.worker_id]) {
        workerTodayMap[e.worker_id] = { name: workerName, meters: 0, machines: new Set() };
      }
      workerTodayMap[e.worker_id].meters += m;
      if (machNum) workerTodayMap[e.worker_id].machines.add(machNum);
    }
  }

  const todayTotal = dayTotal + nightTotal;
  const todayEntriesCount = todayEntries.length;

  // Fleet breakdown
  const fleet: DashboardFleetMachine[] = activeMachines.map(m => {
    const metersToday = machineTodayMeters[m.id] || 0;
    return {
      id: m.id,
      machineNumber: m.machine_number,
      isRunning: metersToday > 0,
      metersToday,
    };
  });

  // Sort machines in natural alphanumeric order: 1..64, then A..D
  fleet.sort((a, b) => {
    const aNum = parseInt(a.machineNumber, 10);
    const bNum = parseInt(b.machineNumber, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else if (!isNaN(aNum)) {
      return -1;
    } else if (!isNaN(bNum)) {
      return 1;
    }
    return a.machineNumber.localeCompare(b.machineNumber, undefined, { numeric: true, sensitivity: 'base' });
  });

  const runningCount = fleet.filter(f => f.isRunning).length;
  const idleCount = fleet.filter(f => !f.isRunning).length;

  // Top worker today
  let topWorkerToday: DashboardStats['topWorkerToday'] = undefined;
  const workerList = Object.values(workerTodayMap).sort((a, b) => b.meters - a.meters);
  if (workerList.length > 0 && workerList[0].meters > 0) {
    topWorkerToday = {
      name: workerList[0].name,
      meters: workerList[0].meters,
      machines: Array.from(workerList[0].machines),
    };
  }

  // 7-day trend
  const sevenDayTrend: DashboardDayTrend[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'EEE dd'); // e.g. "Mon 01"

    const dayEntries = entries.filter(e => e.production_date === dateStr);
    let dMeters = 0;
    let nMeters = 0;

    for (const e of dayEntries) {
      const m = Number(e.meters_produced) || 0;
      if ((e.shift as string) === 'night') {
        nMeters += m;
      } else {
        dMeters += m;
      }
    }

    sevenDayTrend.push({
      date: dateStr,
      dayLabel,
      dayMeters: dMeters,
      nightMeters: nMeters,
      totalMeters: dMeters + nMeters,
    });
  }

  return {
    todayDateStr: format(now, 'dd MMMM yyyy'),
    todayTotal,
    todayEntriesCount,
    dayTotal,
    dayCount,
    nightTotal,
    nightCount,
    fleet,
    runningCount,
    idleCount,
    topWorkerToday,
    sevenDayTrend,
  };
}
