import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import { getAllWorkerMachineAssignments } from '@/actions/workerMachineAssignments';
import BulkAddProductionClient from '@/components/BulkAddProductionClient';
import { createClient } from '@/lib/supabase/server';

export default async function AdminBulkProductionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [workers, machines, workerAssignments] = await Promise.all([
    getWorkers(true),  // active only
    getMachines(true), // active only
    getAllWorkerMachineAssignments(),
  ]);

  const machinesList = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
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
        machines={machinesList}
        userId={user?.id || ''}
        workerAssignments={workerAssignments}
      />
    </div>
  );
}
