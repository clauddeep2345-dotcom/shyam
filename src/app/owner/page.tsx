import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const monthStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [
    { data: todayEntries },
    { data: monthEntries },
    { count: totalWorkers },
  ] = await Promise.all([
    supabase.from('production_entries').select('meters_produced, amount').eq('production_date', today).eq('is_deleted', false),
    supabase.from('production_entries').select('meters_produced, amount').gte('production_date', monthStart).eq('is_deleted', false),
    supabase.from('workers').select('id', { count: 'exact', head: true }).eq('active', true),
  ]);

  const todayMeters = todayEntries?.reduce((s, e) => s + Number(e.meters_produced), 0) || 0;
  const monthMeters = monthEntries?.reduce((s, e) => s + Number(e.meters_produced), 0) || 0;
  const monthAmount = monthEntries?.reduce((s, e) => s + Number(e.amount), 0) || 0;

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', color: '#1e293b' }}>Owner Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Active Workers</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{totalWorkers || 0}</p>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>{"Today's Production"}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0ea5e9' }}>{todayMeters.toFixed(2)} m</p>
        </div>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>This Month</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{monthMeters.toFixed(2)} m</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>₹{monthAmount.toFixed(2)}</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#1e293b' }}>Quick Reports</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link href="/owner/production" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>🧵 Production Log</Link>
        <Link href="/owner/payroll" style={{ padding: '12px 24px', background: '#10b981', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>💰 Payroll History</Link>
      </div>
    </div>
  );
}
