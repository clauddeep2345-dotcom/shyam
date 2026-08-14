'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from './auth';

// Get all machine IDs assigned to a worker
export async function getWorkerMachineAssignments(workerId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('worker_machine_assignments')
    .select('machine_id')
    .eq('worker_id', workerId);

  if (error) return [];
  return (data || []).map(r => r.machine_id);
}

// Get assignments for all workers at once (used on workers list page)
export async function getAllWorkerMachineAssignments(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('worker_machine_assignments')
    .select('worker_id, machine_id');

  if (error) return {};

  const result: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!result[row.worker_id]) result[row.worker_id] = [];
    result[row.worker_id].push(row.machine_id);
  }
  return result;
}

// Set (replace) all machine assignments for a worker
export async function setWorkerMachineAssignments(
  workerId: string,
  machineIds: string[]
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return { error: 'Unauthorized' };

  const supabase = await createClient();

  // Delete existing assignments for this worker
  const { error: delError } = await supabase
    .from('worker_machine_assignments')
    .delete()
    .eq('worker_id', workerId);

  if (delError) return { error: delError.message };

  // Insert new assignments (if any)
  if (machineIds.length > 0) {
    const rows = machineIds.map(machineId => ({
      worker_id: workerId,
      machine_id: machineId,
      assigned_by: user.id,
    }));

    const { error: insError } = await supabase
      .from('worker_machine_assignments')
      .insert(rows);

    if (insError) return { error: insError.message };
  }

  return {};
}
