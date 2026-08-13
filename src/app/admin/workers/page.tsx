import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getCurrentUser } from '@/actions/auth';
import WorkersClient from './WorkersClient';

export default async function WorkersPage() {
  const [workers] = await Promise.all([
    getWorkers(false), // include inactive
  ]);

  return <WorkersClient initialWorkers={workers} />;
}
