import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLiveDashboardStats } from '@/lib/dashboard';
import LiveFactoryDashboard from '@/components/dashboard/LiveFactoryDashboard';

export default async function AdminDashboard() {
  const [stats, supabase] = await Promise.all([
    getLiveDashboardStats(),
    createClient(),
  ]);

  const monthStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [{ count: activeWorkers }, { data: monthEntries }] = await Promise.all([
    supabase.from('workers').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('production_entries').select('meters_produced').gte('production_date', monthStart).eq('is_deleted', false),
  ]);

  const monthMeters = monthEntries?.reduce((sum, e) => sum + Number(e.meters_produced), 0) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Live production metrics and management portal
          </p>
        </div>

        {/* Monthly Summary Pill */}
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 20px',
          display: 'flex',
          gap: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>This Month</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{monthMeters.toFixed(2)} m</div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Workers</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{activeWorkers || 0}</div>
          </div>
        </div>
      </div>

      {/* Live Factory Dashboard (Shift Split, Fleet Status, 7-Day Chart) */}
      <LiveFactoryDashboard stats={stats} />

      {/* Quick Actions */}
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700, color: '#1e293b', marginTop: '36px' }}>
        ⚡ Quick Actions
      </h2>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <Link href="/admin/workers" style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(59,130,246,0.2)' }}>
          👥 Manage Workers
        </Link>
        <Link href="/admin/machines" style={{ padding: '12px 20px', background: '#8b5cf6', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(139,92,246,0.2)' }}>
          ⚙️ Manage Machines
        </Link>
        <Link href="/admin/add-production" style={{ padding: '12px 20px', background: '#10b981', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}>
          ➕ Add Production
        </Link>
        <Link href="/admin/bulk-production" style={{ padding: '12px 20px', background: '#0284c7', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(2,132,199,0.2)' }}>
          🗂️ Bulk Entry
        </Link>
        <Link href="/admin/reports/shifts" style={{ padding: '12px 20px', background: '#7c3aed', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(124,58,237,0.2)' }}>
          ⚖️ Shift Comparison
        </Link>
        <Link href="/admin/production" style={{ padding: '12px 20px', background: '#f59e0b', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>
          🧵 Production Log
        </Link>
        <Link href="/admin/reports/worker-machine" style={{ padding: '12px 20px', background: '#0f172a', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(15,23,42,0.2)' }}>
          🔍 Worker-Machine Report
        </Link>
      </div>

      {/* Data & Backup */}
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700, color: '#1e293b', marginTop: '36px' }}>
        💾 Data & Security
      </h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <a href="/api/backup" download style={{ padding: '12px 20px', background: '#475569', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span>📥</span> Export Full Database Backup (JSON)
        </a>
      </div>
    </div>
  );
}
