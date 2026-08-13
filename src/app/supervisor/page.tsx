import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SupervisorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const { data: entries } = await supabase
    .from('production_entries')
    .select('meters_produced')
    .eq('entered_by', user?.id || '')
    .eq('entry_date', today)
    .eq('is_deleted', false);

  const metersToday = entries?.reduce((sum, e) => sum + Number(e.meters_produced), 0) || 0;
  const entriesToday = entries?.length || 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', color: '#1e293b' }}>
        Supervisor Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>{"Today's Entries"}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#0ea5e9' }}>{entriesToday}</p>
        </div>
        
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h3 style={{ color: '#64748b', fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>{"Today's Meters"}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{metersToday.toFixed(2)} m</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
        <Link 
          href="/supervisor/add-production" 
          style={{ 
            padding: '24px 48px', 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', 
            color: 'white', 
            borderRadius: '16px', 
            textDecoration: 'none', 
            fontWeight: '700',
            fontSize: '24px',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
          }}
        >
          + ADD PRODUCTION
        </Link>
      </div>
    </div>
  );
}
