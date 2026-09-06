import React from 'react';
import { getWorkers } from '@/actions/workers';
import { getWorkerFortnightData, getAllWorkersFortnightMachineTotals } from '@/actions/fortnight';
import FortnightSheetClient from './FortnightSheetClient';

export default async function FortnightReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    workerId?: string;
    year?: string;
    month?: string;
    period?: string;
  }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const currentDay = now.getDate();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;
  const defaultPeriod: '1-15' | '16-end' = currentDay <= 15 ? '1-15' : '16-end';

  const year = sp.year ? parseInt(sp.year, 10) : defaultYear;
  const month = sp.month ? parseInt(sp.month, 10) : defaultMonth;
  const period = (sp.period === '1-15' || sp.period === '16-end') ? sp.period : defaultPeriod;

  const workers = await getWorkers(false);

  const workerId = sp.workerId || (workers.length > 0 ? workers[0].id : '');

  const [initialData, initialAllWorkersData] = await Promise.all([
    workerId && workerId !== 'ALL'
      ? getWorkerFortnightData({ workerId, year, month, period })
      : null,
    getAllWorkersFortnightMachineTotals({ year, month, period }),
  ]);

  return (
    <FortnightSheetClient
      workers={workers.map(w => ({ id: w.id, name: w.name }))}
      initialData={initialData}
      initialAllWorkersData={initialAllWorkersData}
      selectedWorkerId={workerId}
      selectedYear={year}
      selectedMonth={month}
      selectedPeriod={period}
    />
  );
}
