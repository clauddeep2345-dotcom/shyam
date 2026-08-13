'use client';

import React, { useState, useTransition } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

interface Entry {
  id: string;
  productionDate: string;
  metersProduced: number;
  rateApplied: number;
  amount: number;
  machineNumber: string;
  machineName: string;
}

interface Props {
  workerId: string;
  workerName: string;
  entries: Entry[];
  startDate: string;
  endDate: string;
}

function downloadCSV(
  entries: Entry[],
  workerName: string,
  startDate: string,
  endDate: string
) {
  const headers = ['Date', 'Machine', 'Rate (₹/m)', 'Meters', 'Amount (₹)'];
  const rows = entries.map(e => [
    e.productionDate,
    e.machineNumber + (e.machineName ? ' (' + e.machineName + ')' : ''),
    e.rateApplied.toFixed(3),
    e.metersProduced.toFixed(2),
    e.amount.toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  const csvContent = [
    `Worker Report: ${workerName} | ${startDate} to ${endDate}`,
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
  a.download = `worker_${workerName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(
  entries: Entry[],
  workerName: string,
  startDate: string,
  endDate: string
) {
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const avgPerEntry = entries.length > 0 ? totalMeters / entries.length : 0;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = entries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
      <td><strong>${e.machineNumber}</strong>${e.machineName ? ' <span style="color:#94a3b8;font-size:11px">' + e.machineName + '</span>' : ''}</td>
      <td>${e.rateApplied.toFixed(3)}</td>
      <td>${e.metersProduced.toFixed(2)} m</td>
      <td>\u20b9${e.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${workerName} — Worker Report: ${startDate} to ${endDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    .cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .card { padding: 10px 16px; border-radius: 8px; min-width: 120px; }
    .card label { font-size: 9px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .card span { font-size: 16px; font-weight: 700; }
    .card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .card.green label { color: #166534; } .card.green span { color: #15803d; }
    .card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .card.blue label { color: #1d4ed8; } .card.blue span { color: #2563eb; }
    .card.purple { background: #fdf4ff; border: 1px solid #e9d5ff; }
    .card.purple label { color: #7e22ce; } .card.purple span { color: #7c3aed; }
    .card.orange { background: #fff7ed; border: 1px solid #fed7aa; }
    .card.orange label { color: #c2410c; } .card.orange span { color: #ea580c; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1e293b; color: white; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    tfoot tr { background: #f1f5f9; font-weight: 700; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${workerName}</h1>
  <div class="subtitle">Individual Worker Production Report</div>
  <div class="meta">Period: ${startDate} to ${endDate} &nbsp;|&nbsp; Generated on ${dateStr} &nbsp;|&nbsp; ${entries.length} entries</div>
  <div class="cards">
    <div class="card green"><label>Total Meters</label><span>${totalMeters.toFixed(2)} m</span></div>
    <div class="card blue"><label>Total Amount</label><span>\u20b9${totalAmount.toFixed(2)}</span></div>
    <div class="card purple"><label>Total Entries</label><span>${entries.length}</span></div>
    <div class="card orange"><label>Avg per Entry</label><span>${avgPerEntry.toFixed(2)} m</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Machine</th><th>Rate (\u20b9/m)</th><th>Meters</th><th>Amount (\u20b9)</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4">TOTAL</td><td>${totalMeters.toFixed(2)} m</td><td>\u20b9${totalAmount.toFixed(2)}</td></tr></tfoot>
  </table>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function WorkerDetailClient({
  workerId,
  workerName,
  entries,
  startDate: serverStart,
  endDate: serverEnd,
}: Props) {
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const avgPerEntry = entries.length > 0 ? totalMeters / entries.length : 0;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`/admin/reports/workers/${workerId}?start=${startDate}&end=${endDate}`);
    });
  };

  return (
    <div>
      {/* Back breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/admin/reports/workers"
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to Worker Report
        </Link>
      </div>

      {/* Header */}
      <div className={tableStyles.pageHeader}>
        <div>
          <h1 className={tableStyles.pageTitle} style={{ marginBottom: '4px' }}>
            {workerName}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Individual Worker Production Report</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(entries, workerName, serverStart, serverEnd)}
          >
            ⬇ Download CSV
          </button>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(entries, workerName, serverStart, serverEnd)}
          >
            📄 Download PDF
          </button>
        </div>
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

      {/* Summary cards */}
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
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Entries</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7c3aed' }}>{entries.length}</div>
        </div>
        <div style={{ background: '#fff7ed', padding: '16px 24px', borderRadius: '10px', border: '1px solid #fed7aa', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Avg per Entry</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ea580c' }}>{avgPerEntry.toFixed(2)} m</div>
        </div>
      </div>

      {/* Period label */}
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
        📅 Showing data from{' '}
        <strong>{format(new Date(serverStart + 'T00:00:00'), 'dd MMM yyyy')}</strong> to{' '}
        <strong>{format(new Date(serverEnd + 'T00:00:00'), 'dd MMM yyyy')}</strong>
      </p>

      {/* Table */}
      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Machine</th>
              <th>Rate (₹/m)</th>
              <th>Meters</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id}>
                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: '#0f172a' }}>
                  {format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}
                </td>
                <td style={{ color: '#475569' }}>
                  <span style={{ fontWeight: 700 }}>{e.machineNumber}</span>
                  {e.machineName && (
                    <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '13px' }}>
                      {e.machineName}
                    </span>
                  )}
                </td>
                <td style={{ color: '#64748b' }}>{e.rateApplied.toFixed(3)}</td>
                <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{e.metersProduced.toFixed(2)} m</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{e.amount.toFixed(2)}</td>
              </tr>
            ))}
            {entries.length > 0 && (
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={4} style={{ color: '#0f172a' }}>TOTAL</td>
                <td style={{ color: '#0ea5e9' }}>{totalMeters.toFixed(2)} m</td>
                <td style={{ color: '#16a34a' }}>₹{totalAmount.toFixed(2)}</td>
              </tr>
            )}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  No production entries found for this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
