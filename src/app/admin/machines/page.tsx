import React from 'react';
import { getMachinesWithCurrentRate } from '@/actions/machines';
import MachinesClient from './MachinesClient';

export default async function MachinesPage() {
  const machines = await getMachinesWithCurrentRate();
  return <MachinesClient initialMachines={machines} />;
}
