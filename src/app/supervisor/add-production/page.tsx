import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import AddProductionClient from './AddProductionClient';
import { createClient } from '@/lib/supabase/server';

export default async function AddProductionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  const [workers, machines, { data: rates }] = await Promise.all([
    getWorkers(true), // active only
    getMachines(true), // active only
    supabase
      .from('machine_rates')
      .select('machine_id, rate_per_meter')
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
  ]);

  const rateMap = new Map<string, number>();
  rates?.forEach(r => rateMap.set(r.machine_id, Number(r.rate_per_meter)));

  const machinesWithRate = machines.map(m => ({
    id: m.id,
    machineNumber: m.machine_number,
    currentRatePerMeter: rateMap.get(m.id) || 0,
  }));

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', color: '#1e293b' }}>
        Add Production Entry
      </h1>
      
      <AddProductionClient 
        workers={workers.map(w => ({ id: w.id, name: w.name }))}
        machines={machinesWithRate}
        userId={user?.id || ''}
      />
    </div>
  );
}
