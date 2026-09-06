'use client';

import React, { useState, useTransition } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

interface WorkerSummary {
  id: string;
  name: string;
  totalMeters: number;
  totalAmount?: number;
  entries: number;
}

interface Props {
  initialSummary: WorkerSummary[];
  startDate: string;
  endDate: string;
}

function downloadCSV(summary: WorkerSummary[], startDate: string, endDate: string) {
  const headers = ['Worker Name', 'Total Entries', 'Total Meters', 'Avg. per Entry (m)'];
  const rows = summary.map(w => [
    w.name,
    w.entries.toString(),
    w.totalMeters.toFixed(2),
    (w.totalMeters / (w.entries || 1)).toFixed(2),
  ]);
  const totalMeters = summary.reduce((s, w) => s + w.totalMeters, 0);
  const totalEntries = summary.reduce((s, w) => s + w.entries, 0);

  const csvContent = [
    `Worker-wise Production Summary: ${startDate} to ${endDate}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TOTAL,${totalEntries},${totalMeters.toFixed(2)},${(totalMeters / (totalEntries || 1)).toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worker_report_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(summary: WorkerSummary[], startDate: string, endDate: string) {
  const totalMeters = summary.reduce((s, w) => s + w.totalMeters, 0);
  const totalEntries = summary.reduce((s, w) => s + w.entries, 0);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = summary.map((w, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${w.name}</td>
      <td>${w.entries}</td>
      <td>${w.totalMeters.toFixed(2)} m</td>
      <td>${(w.totalMeters / (w.entries || 1)).toFixed(2)} m</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Worker-wise Production Report: ${startDate} to ${endDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1e293b; color: white; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; display: flex; gap: 40px; }
    .total-item label { font-size: 10px; text-transform: uppercase; color: #166534; font-weight: 700; display: block; margin-bottom: 2px; }
    .total-item span { font-size: 18px; font-weight: 700; color: #15803d; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>Worker-wise Production Report</h1>
  <div class="meta">Period: ${startDate} to ${endDate} &nbsp;|&nbsp; Generated on ${dateStr} &nbsp;|&nbsp; ${summary.length} workers</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Worker Name</th>
        <th>Total Entries</th>
        <th>Total Meters</th>
        <th>Avg. per Entry</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f1f5f9;font-weight:700;">
        <td colspan="2">TOTAL</td>
        <td>${totalEntries}</td>
        <td>${totalMeters.toFixed(2)} m</td>
        <td>${(totalMeters / (totalEntries || 1)).toFixed(2)} m</td>
      </tr>
    </tfoot>
  </table>
  <div class="totals">
    <div class="total-item"><label>Total Meters</label><span>${totalMeters.toFixed(2)} m</span></div>
    <div class="total-item"><label>Total Entries</label><span>${totalEntries}</span></div>
    <div class="total-item"><label>Total Workers</label><span>${summary.length}</span></div>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function WorkerReportClient({ initialSummary, startDate: serverStart, endDate: serverEnd }: Props) {
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const summary = initialSummary;
  const totalMeters = summary.reduce((s, w) => s + w.totalMeters, 0);
  const totalEntries = summary.reduce((s, w) => s + w.entries, 0);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`?start=${startDate}&end=${endDate}`);
    });
  };

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>Worker Production Report</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(summary, serverStart, serverEnd)}
            disabled={summary.length === 0}
          >
            ⬇ Download CSV
          </button>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(summary, serverStart, serverEnd)}
            disabled={summary.length === 0}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className={tableStyles.filterCard}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '180px', flex: '1 1 180px' }}>
            <label>Start Date</label>
            <input type="date" value={startDate} max={today} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '180px', flex: '1 1 180px' }}>
            <label>End Date</label>
            <input type="date" value={endDate} max={today} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <button type="submit" className={tableStyles.primaryButton} disabled={isPending} style={{ padding: '12px 22px' }}>
            {isPending ? 'Loading...' : '🔍 Apply Filter'}
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)', borderTop: '4px solid #16a34a', minWidth: '180px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Total Meters</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{totalMeters.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600 }}>m</span></div>
        </div>
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)', borderTop: '4px solid #0284c7', minWidth: '180px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Total Entries</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#1d4ed8', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{totalEntries}</div>
        </div>
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)', borderTop: '4px solid #9333ea', minWidth: '180px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Workers</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{summary.length}</div>
        </div>
      </div>

      {/* Period label */}
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
        📅 Showing data from <strong>{format(new Date(serverStart + 'T00:00:00'), 'dd MMM yyyy')}</strong> to <strong>{format(new Date(serverEnd + 'T00:00:00'), 'dd MMM yyyy')}</strong>
      </p>

      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Worker Name</th>
              <th>Total Entries</th>
              <th>Total Meters</th>
              <th>Avg. per Entry</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((w, i) => (
              <tr key={w.id}>
                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>{w.name}</td>
                <td style={{ color: '#475569' }}>{w.entries}</td>
                <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{w.totalMeters.toFixed(2)} m</td>
                <td style={{ color: '#64748b' }}>{(w.totalMeters / (w.entries || 1)).toFixed(2)} m</td>
                <td>
                  <Link
                    href={`/admin/reports/workers/${w.id}?start=${serverStart}&end=${serverEnd}`}
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
                <td colSpan={2} style={{ color: '#0f172a' }}>TOTAL</td>
                <td style={{ color: '#0f172a' }}>{totalEntries}</td>
                <td style={{ color: '#0ea5e9' }}>{totalMeters.toFixed(2)} m</td>
                <td style={{ color: '#64748b' }}>{(totalMeters / (totalEntries || 1)).toFixed(2)} m</td>
                <td></td>
              </tr>
            )}
            {summary.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
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
