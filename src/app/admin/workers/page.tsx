import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getMachines } from '@/actions/machines';
import { getAllWorkerMachineAssignments } from '@/actions/workerMachineAssignments';
import WorkersClient from './WorkersClient';

export default async function WorkersPage() {
  const [workers, machines, assignments] = await Promise.all([
    getWorkers(false), // include inactive
    getMachines(true), // active machines only
    getAllWorkerMachineAssignments(),
  ]);

  return (
    <WorkersClient
      initialWorkers={workers}
      machines={machines.map(m => ({ id: m.id, machineNumber: m.machine_number }))}
      initialAssignments={assignments}
    />
  );
}
