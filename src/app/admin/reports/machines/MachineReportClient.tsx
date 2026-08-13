'use client';

import React, { useState, useTransition } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

interface MachineSummary {
  id: string;
  machineNumber: string;
  name: string;
  totalMeters: number;
  totalAmount: number;
  entries: number;
}

interface Props {
  initialSummary: MachineSummary[];
  startDate: string;
  endDate: string;
}

function downloadCSV(summary: MachineSummary[], startDate: string, endDate: string) {
  const headers = ['Machine No.', 'Name', 'Total Entries', 'Total Meters', 'Total Amount (₹)'];
  const rows = summary.map(m => [
    m.machineNumber,
    m.name,
    m.entries.toString(),
    m.totalMeters.toFixed(2),
    m.totalAmount.toFixed(2),
  ]);
  const totalMeters = summary.reduce((s, m) => s + m.totalMeters, 0);
  const totalAmount = summary.reduce((s, m) => s + m.totalAmount, 0);

  const csvContent = [
    `Machine-wise Production Summary: ${startDate} to ${endDate}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TOTAL,,,${totalMeters.toFixed(2)},${totalAmount.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `machine_report_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// NOTE: summary data comes directly from props (no useState wrapper)
// This ensures fresh server data is always displayed after filtering.
export default function MachineReportClient({ initialSummary, startDate: serverStart, endDate: serverEnd }: Props) {
  // Date inputs: local state for controlled input fields only
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  // Always use prop data — never stale state
  const summary = initialSummary;
  const totalMeters = summary.reduce((s, m) => s + m.totalMeters, 0);
  const totalAmount = summary.reduce((s, m) => s + m.totalAmount, 0);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`?start=${startDate}&end=${endDate}`);
    });
  };

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>Machine-wise Production Report</h1>
        <button
          className={tableStyles.primaryButton}
          style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
          onClick={() => downloadCSV(summary, serverStart, serverEnd)}
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Date filter */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '180px' }}>
            <label>Start Date</label>
            <input type="date" value={startDate} max={today} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '180px' }}>
            <label>End Date</label>
            <input type="date" value={endDate} max={today} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <button type="submit" className={tableStyles.primaryButton} disabled={isPending}>
            {isPending ? 'Loading...' : 'Apply Filter'}
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', padding: '16px 24px', borderRadius: '10px', border: '1px solid #bbf7d0', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Meters</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#15803d' }}>{totalMeters.toFixed(2)} m</div>
        </div>
        <div style={{ background: '#eff6ff', padding: '16px 24px', borderRadius: '10px', border: '1px solid #bfdbfe', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb' }}>₹{totalAmount.toFixed(2)}</div>
        </div>
        <div style={{ background: '#fdf4ff', padding: '16px 24px', borderRadius: '10px', border: '1px solid #e9d5ff', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Machines</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7c3aed' }}>{summary.length}</div>
        </div>
      </div>

      {/* Period label — uses server dates so it always reflects actual data */}
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
        📅 Showing data from <strong>{format(new Date(serverStart + 'T00:00:00'), 'dd MMM yyyy')}</strong> to <strong>{format(new Date(serverEnd + 'T00:00:00'), 'dd MMM yyyy')}</strong>
      </p>

      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Machine No.</th>
              <th>Name</th>
              <th>Total Entries</th>
              <th>Total Meters</th>
              <th>Total Amount (₹)</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((m, i) => (
              <tr key={m.id}>
                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>{m.machineNumber}</td>
                <td style={{ color: '#475569' }}>{m.name || '—'}</td>
                <td style={{ color: '#475569' }}>{m.entries}</td>
                <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{m.totalMeters.toFixed(2)} m</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{m.totalAmount.toFixed(2)}</td>
                <td>
                  <Link
                    href={`/admin/reports/machines/${m.id}?start=${serverStart}&end=${serverEnd}`}
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid #bfdbfe',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {/* Totals row */}
            {summary.length > 0 && (
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={3} style={{ color: '#0f172a' }}>TOTAL</td>
                <td style={{ color: '#0f172a' }}>{summary.reduce((s, m) => s + m.entries, 0)}</td>
                <td style={{ color: '#0ea5e9' }}>{totalMeters.toFixed(2)} m</td>
                <td style={{ color: '#16a34a' }}>₹{totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            )}
            {summary.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No production data found for this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
