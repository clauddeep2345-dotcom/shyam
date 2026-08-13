import React from 'react';
import { createClient } from '@/lib/supabase/server';
import PayrollClient from './PayrollClient';
import { getCurrentUser } from '@/actions/auth';

export default async function PayrollPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: periods } = await supabase
    .from('payroll_periods')
    .select(`
      *,
      payroll_records(
        *,
        workers!inner(id, name)
      )
    `)
    .order('period_start', { ascending: false });

  return <PayrollClient initialPeriods={periods || []} userId={user?.id || ''} />;
}
