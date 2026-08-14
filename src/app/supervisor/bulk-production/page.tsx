import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import { getAllWorkerMachineAssignments } from '@/actions/workerMachineAssignments';
import BulkAddProductionClient from '@/components/BulkAddProductionClient';
import { createClient } from '@/lib/supabase/server';

export default async function SupervisorBulkProductionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [workers, machines, workerAssignments] = await Promise.all([
    getWorkers(true),  // active only
    getMachines(true), // active only
    getAllWorkerMachineAssignments(),
  ]);

  // Get machines with current rates
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const { data: rates } = await supabase
    .from('machine_rates')
    .select('machine_id, rate_per_meter')
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);

  const rateMap = new Map<string, number>();
  rates?.forEach(r => rateMap.set(r.machine_id, Number(r.rate_per_meter)));

  const machinesWithRate = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
    currentRatePerMeter: rateMap.get(m.id) || 0,
  }));

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '24px', color: '#1e293b', fontWeight: 700 }}>
        Bulk Add Production
      </h1>
      <p style={{ marginBottom: '28px', color: '#64748b', fontSize: '15px' }}>
        Select a worker — only their assigned machines will appear. Enter meters and save in one click.
      </p>

      <BulkAddProductionClient
        workers={workers.map(w => ({ id: w.id, name: w.name }))}
        machines={machinesWithRate}
        userId={user?.id || ''}
        workerAssignments={workerAssignments}
      />
    </div>
  );
}
