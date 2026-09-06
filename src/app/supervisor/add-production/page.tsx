import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import AddProductionClient from './AddProductionClient';
import { createClient } from '@/lib/supabase/server';

export default async function AddProductionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [workers, machines] = await Promise.all([
    getWorkers(true), // active only
    getMachines(true), // active only
  ]);

  const machinesList = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
  }));

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', color: '#1e293b' }}>
        Add Production Entry
      </h1>
      
      <AddProductionClient 
        workers={workers.map(w => ({ id: w.id, name: w.name }))}
        machines={machinesList}
        userId={user?.id || ''}
      />
    </div>
  );
}
