import React from 'react';
import { getProductionEntries } from '@/actions/production';
import ProductionListClient from '@/components/ProductionListClient';
import { subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';

export default async function OwnerProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const startDate = params.start || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30));
  const endDate = params.end || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const entries = await getProductionEntries({ startDate, endDate });

  const serialized = entries.map(e => ({
    id: e.id,
    productionDate: e.production_date,
    entryDate: e.entry_date,
    meters: String(e.meters_produced),
    ratePerMeter: String(e.rate_applied),
    amount: String(e.amount),
    worker: { id: (e as any).workers?.id || '', name: (e as any).workers?.name || '' },
    machine: { id: (e as any).machines?.id || '', machineNumber: (e as any).machines?.machine_number || '' },
    enteredBy: e.entered_by,
  }));

  return (
    <ProductionListClient
      initialEntries={serialized}
      title="Production Log"
      currentUserId={user?.id}
      currentUserRole="owner"
    />
  );
}
