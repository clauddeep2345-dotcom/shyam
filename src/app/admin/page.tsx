import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: activeWorkers },
    { count: activeMachines },
    { data: todayEntries },
    { data: pendingRecords },
  ] = await Promise.all([
    supabase.from('workers').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('machines').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('production_entries').select('meters_produced, amount').eq('production_date', today).eq('is_deleted', false),
    supabase.from('payroll_records').select('net_amount').eq('payment_status', 'pending'),
  ]);

  const todayMeters = todayEntries?.reduce((sum, e) => sum + Number(e.meters_produced), 0) || 0;
  const todayAmount = todayEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const unpaidSalary = pendingRecords?.reduce((sum, r) => sum + Number(r.net_amount), 0) || 0;

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', color: '#1e293b' }}>
        Admin Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Active Workers</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{activeWorkers || 0}</p>
        </div>
        
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Active Machines</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{activeMachines || 0}</p>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>{"Today's Production"}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0ea5e9' }}>
            {todayMeters.toFixed(2)} m
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#16a34a', fontSize: '14px', fontWeight: '600' }}>
            ₹{todayAmount.toFixed(2)}
          </p>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Unpaid Salaries</h3>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            ₹{unpaidSalary.toFixed(2)}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Pending payment</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#1e293b' }}>Quick Actions</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link href="/admin/workers" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>👥 Manage Workers</Link>
        <Link href="/admin/machines" style={{ padding: '12px 24px', background: '#8b5cf6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>⚙️ Machines & Rates</Link>
        <Link href="/admin/payroll" style={{ padding: '12px 24px', background: '#10b981', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>💰 Manage Payroll</Link>
        <Link href="/admin/production" style={{ padding: '12px 24px', background: '#f59e0b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>🧵 Production Log</Link>
      </div>
    </div>
  );
}
