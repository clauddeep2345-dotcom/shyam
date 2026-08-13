import { createClient } from '@/lib/supabase/server';
import type { PayrollWorkerSummary, PayrollCalculationLine } from '@/lib/types/database';

/**
 * Calculate payroll for a given period.
 * Aggregates production entries per worker per machine, grouped by rate_applied.
 * Returns a per-worker breakdown with totals, advance deductions, and net amounts.
 */
export async function calculatePayrollForPeriod(periodId: string): Promise<PayrollWorkerSummary[]> {
  const supabase = await createClient();

  // Get the period boundaries
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('period_start, period_end')
    .eq('id', periodId)
    .single();

  if (periodError || !period) throw new Error('Payroll period not found');

  // Get all non-deleted production entries for this period
  const { data: entries, error: entriesError } = await supabase
    .from('production_entries')
    .select(`
      id, worker_id, machine_id, meters_produced, rate_applied, amount,
      workers!inner(id, name),
      machines!inner(id, machine_number, name)
    `)
    .gte('production_date', period.period_start)
    .lte('production_date', period.period_end)
    .eq('is_deleted', false)
    .order('worker_id')
    .order('machine_id');

  if (entriesError) throw new Error(`Failed to fetch entries: ${entriesError.message}`);
  if (!entries || entries.length === 0) return [];

  // Group entries by worker, then by machine+rate
  const workerMap = new Map<string, {
    workerName: string;
    lines: Map<string, PayrollCalculationLine & { entryIds: string[] }>;
  }>();

  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = entry.workers as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const machine = entry.machines as any;

    if (!workerMap.has(entry.worker_id)) {
      workerMap.set(entry.worker_id, {
        workerName: worker.name,
        lines: new Map(),
      });
    }

    const workerData = workerMap.get(entry.worker_id)!;
    const lineKey = `${entry.machine_id}_${entry.rate_applied}`;

    if (!workerData.lines.has(lineKey)) {
      workerData.lines.set(lineKey, {
        worker_id: entry.worker_id,
        worker_name: worker.name,
        machine_id: entry.machine_id,
        machine_name: `${machine.machine_number} — ${machine.name}`,
        total_meters: 0,
        rate_per_meter: Number(entry.rate_applied),
        total_amount: 0,
        entry_count: 0,
        entryIds: [],
      });
    }

    const line = workerData.lines.get(lineKey)!;
    line.total_meters += Number(entry.meters_produced);
    line.total_amount += Number(entry.amount);
    line.entry_count += 1;
    line.entryIds.push(entry.id);
  }

  // Get pending advances for each worker
  const workerIds = Array.from(workerMap.keys());
  const { data: advances } = await supabase
    .from('worker_advances')
    .select('worker_id, amount')
    .in('worker_id', workerIds)
    .eq('status', 'pending');

  const advanceMap = new Map<string, number>();
  if (advances) {
    for (const adv of advances) {
      advanceMap.set(adv.worker_id, (advanceMap.get(adv.worker_id) || 0) + Number(adv.amount));
    }
  }

  // Build summaries
  const summaries: PayrollWorkerSummary[] = [];

  for (const [workerId, workerData] of workerMap) {
    const lines = Array.from(workerData.lines.values());
    const totalMeters = lines.reduce((sum, l) => sum + l.total_meters, 0);
    const totalAmount = lines.reduce((sum, l) => sum + l.total_amount, 0);
    const advanceDeduction = Math.min(advanceMap.get(workerId) || 0, totalAmount);
    const netAmount = totalAmount - advanceDeduction;

    summaries.push({
      worker_id: workerId,
      worker_name: workerData.workerName,
      lines: lines.map(({ entryIds: _entryIds, ...rest }) => rest),
      total_meters: Math.round(totalMeters * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      advance_deduction: Math.round(advanceDeduction * 100) / 100,
      net_amount: Math.round(netAmount * 100) / 100,
    });
  }

  return summaries.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
}
