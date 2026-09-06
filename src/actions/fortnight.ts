'use server';

import { createClient } from '@/lib/supabase/server';

export interface FortnightMachineRow {
  machineId: string;
  machineNumber: string;
  dailyMeters: Record<number, number>;
  dailyShifts: Record<number, { day: number; night: number }>;
  totalMeters: number;
  totalDayMeters: number;
  totalNightMeters: number;
}

export interface WorkerFortnightData {
  workerId: string;
  workerName: string;
  year: number;
  month: number;
  period: '1-15' | '16-end';
  startDate: string;
  endDate: string;
  days: number[];
  machines: FortnightMachineRow[];
  dailyTotals: Record<number, number>;
  dailyDayTotals: Record<number, number>;
  dailyNightTotals: Record<number, number>;
  grandTotal: number;
  dayShiftTotal: number;
  nightShiftTotal: number;
  activeDaysCount: number;
  activeMachinesCount: number;
}

export async function getWorkerFortnightData(params: {
  workerId: string;
  year: number;
  month: number;
  period: '1-15' | '16-end';
}): Promise<WorkerFortnightData | null> {
  const { workerId, year, month, period } = params;
  if (!workerId) return null;

  const startDay = period === '1-15' ? 1 : 16;
  const lastDay = new Date(year, month, 0).getDate(); // handles 28, 29, 30, or 31
  const endDay = period === '1-15' ? 15 : lastDay;

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month)}-${pad(startDay)}`;
  const endDate = `${year}-${pad(month)}-${pad(endDay)}`;

  const days: number[] = [];
  for (let d = startDay; d <= endDay; d++) {
    days.push(d);
  }

  const supabase = await createClient();

  const [workerRes, entriesRes] = await Promise.all([
    supabase
      .from('workers')
      .select('id, name')
      .eq('id', workerId)
      .single(),
    supabase
      .from('production_entries')
      .select(`
        id,
        production_date,
        shift,
        meters_produced,
        machine_id,
        machines (id, machine_number)
      `)
      .eq('worker_id', workerId)
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .eq('is_deleted', false),
  ]);

  const worker = workerRes.data;
  if (!worker) return null;

  const entries = entriesRes.data || [];

  // Group by machine
  const machineMap = new Map<string, FortnightMachineRow>();
  const activeDaysSet = new Set<number>();
  const dailyTotals: Record<number, number> = {};
  const dailyDayTotals: Record<number, number> = {};
  const dailyNightTotals: Record<number, number> = {};
  days.forEach(d => {
    dailyTotals[d] = 0;
    dailyDayTotals[d] = 0;
    dailyNightTotals[d] = 0;
  });

  let grandTotal = 0;
  let dayShiftTotal = 0;
  let nightShiftTotal = 0;

  for (const e of entries) {
    const mId = e.machine_id;
    const machNumber = (e.machines as any)?.machine_number || '—';
    const meters = Number(e.meters_produced) || 0;
    const shift = (e.shift as string) === 'night' ? 'night' : 'day';

    // Extract day of month from 'YYYY-MM-DD'
    const dayNum = parseInt(e.production_date.split('-')[2], 10);

    if (!machineMap.has(mId)) {
      const initialDailyMeters: Record<number, number> = {};
      const initialDailyShifts: Record<number, { day: number; night: number }> = {};
      days.forEach(d => {
        initialDailyMeters[d] = 0;
        initialDailyShifts[d] = { day: 0, night: 0 };
      });

      machineMap.set(mId, {
        machineId: mId,
        machineNumber: machNumber,
        dailyMeters: initialDailyMeters,
        dailyShifts: initialDailyShifts,
        totalMeters: 0,
        totalDayMeters: 0,
        totalNightMeters: 0,
      });
    }

    const machRow = machineMap.get(mId)!;
    if (machRow.dailyMeters[dayNum] !== undefined) {
      machRow.dailyMeters[dayNum] += meters;
      machRow.dailyShifts[dayNum][shift] += meters;
      machRow.totalMeters += meters;

      dailyTotals[dayNum] = (dailyTotals[dayNum] || 0) + meters;
      grandTotal += meters;

      if (shift === 'night') {
        nightShiftTotal += meters;
        machRow.totalNightMeters += meters;
        dailyNightTotals[dayNum] = (dailyNightTotals[dayNum] || 0) + meters;
      } else {
        dayShiftTotal += meters;
        machRow.totalDayMeters += meters;
        dailyDayTotals[dayNum] = (dailyDayTotals[dayNum] || 0) + meters;
      }

      activeDaysSet.add(dayNum);
    }
  }

  // Sort machines in natural alphanumeric order: 1..64, then A..D
  const machines = Array.from(machineMap.values()).sort((a, b) => {
    const aNum = parseInt(a.machineNumber, 10);
    const bNum = parseInt(b.machineNumber, 10);
    if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    if (!isNaN(aNum) && isNaN(bNum)) return -1;
    if (isNaN(aNum) && !isNaN(bNum)) return 1;
    return a.machineNumber.localeCompare(b.machineNumber);
  });

  return {
    workerId,
    workerName: worker.name,
    year,
    month,
    period,
    startDate,
    endDate,
    days,
    machines,
    dailyTotals,
    dailyDayTotals,
    dailyNightTotals,
    grandTotal,
    dayShiftTotal,
    nightShiftTotal,
    activeDaysCount: activeDaysSet.size,
    activeMachinesCount: machines.length,
  };
}

export interface WorkerMachineTotalItem {
  machineId: string;
  machineNumber: string;
  totalMeters: number;
}

export interface WorkerSummaryGroup {
  workerId: string;
  workerName: string;
  machines: WorkerMachineTotalItem[];
  workerTotalMeters: number;
}

export interface AllWorkersFortnightData {
  year: number;
  month: number;
  period: '1-15' | '16-end';
  startDate: string;
  endDate: string;
  workers: WorkerSummaryGroup[];
  grandTotalMeters: number;
  totalMachinesOperated: number;
  activeWorkersCount: number;
}

export async function getAllWorkersFortnightMachineTotals(params: {
  year: number;
  month: number;
  period: '1-15' | '16-end';
}): Promise<AllWorkersFortnightData> {
  const { year, month, period } = params;

  const startDay = period === '1-15' ? 1 : 16;
  const lastDay = new Date(year, month, 0).getDate();
  const endDay = period === '1-15' ? 15 : lastDay;

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month)}-${pad(startDay)}`;
  const endDate = `${year}-${pad(month)}-${pad(endDay)}`;

  const supabase = await createClient();

  const [workersRes, entriesRes] = await Promise.all([
    supabase.from('workers').select('id, name').eq('active', true).order('name'),
    supabase
      .from('production_entries')
      .select('worker_id, machine_id, meters_produced, machines(id, machine_number)')
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .eq('is_deleted', false),
  ]);

  const workers = workersRes.data || [];
  const entries = entriesRes.data || [];

  const workerMap = new Map<string, {
    workerId: string;
    workerName: string;
    machinesMap: Map<string, WorkerMachineTotalItem>;
    workerTotalMeters: number;
  }>();

  for (const w of workers) {
    workerMap.set(w.id, {
      workerId: w.id,
      workerName: w.name,
      machinesMap: new Map(),
      workerTotalMeters: 0,
    });
  }

  const allMachineIds = new Set<string>();
  let grandTotalMeters = 0;

  for (const e of entries) {
    if (!workerMap.has(e.worker_id)) {
      workerMap.set(e.worker_id, {
        workerId: e.worker_id,
        workerName: 'Other Worker',
        machinesMap: new Map(),
        workerTotalMeters: 0,
      });
    }

    const wGroup = workerMap.get(e.worker_id)!;
    const mId = e.machine_id;
    const mNum = (e.machines as any)?.machine_number || '—';
    const meters = Number(e.meters_produced) || 0;

    if (!wGroup.machinesMap.has(mId)) {
      wGroup.machinesMap.set(mId, {
        machineId: mId,
        machineNumber: mNum,
        totalMeters: 0,
      });
    }

    const mach = wGroup.machinesMap.get(mId)!;
    mach.totalMeters += meters;
    wGroup.workerTotalMeters += meters;
    grandTotalMeters += meters;
    allMachineIds.add(mId);
  }

  const resultWorkers: WorkerSummaryGroup[] = [];
  for (const wGroup of workerMap.values()) {
    if (wGroup.workerTotalMeters === 0) continue;

    const machines = Array.from(wGroup.machinesMap.values()).sort((a, b) => {
      const aNum = parseInt(a.machineNumber, 10);
      const bNum = parseInt(b.machineNumber, 10);
      if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
      if (!isNaN(aNum) && isNaN(bNum)) return -1;
      if (isNaN(aNum) && !isNaN(bNum)) return 1;
      return a.machineNumber.localeCompare(b.machineNumber);
    });

    resultWorkers.push({
      workerId: wGroup.workerId,
      workerName: wGroup.workerName,
      machines,
      workerTotalMeters: wGroup.workerTotalMeters,
    });
  }

  resultWorkers.sort((a, b) => a.workerName.localeCompare(b.workerName));

  return {
    year,
    month,
    period,
    startDate,
    endDate,
    workers: resultWorkers,
    grandTotalMeters,
    totalMachinesOperated: allMachineIds.size,
    activeWorkersCount: resultWorkers.length,
  };
}
