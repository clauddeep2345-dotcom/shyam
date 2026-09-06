'use client';

import React, { useState, useTransition, useMemo } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

interface Entry {
  id: string;
  productionDate: string;
  shift: 'day' | 'night';
  metersProduced: number;
  workerId?: string;
  workerName: string;
}

interface Props {
  machineId: string;
  machineNumber: string;
  entries: Entry[];
  startDate: string;
  endDate: string;
}

function downloadCSV(
  entries: Entry[],
  machineNumber: string,
  startDate: string,
  endDate: string,
  selectedWorkerLabel?: string
) {
  const headers = ['Date', 'Shift', 'Worker', 'Meters'];
  const rows = entries.map(e => [
    e.productionDate,
    e.shift === 'night' ? 'Night' : 'Day',
    `"${e.workerName.replace(/"/g, '""')}"`,
    e.metersProduced.toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);

  const csvContent = [
    `Machine Report: Machine ${machineNumber}`,
    selectedWorkerLabel ? `Worker: ${selectedWorkerLabel}` : 'Worker: All Workers',
    `Period: ${startDate} to ${endDate}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TOTAL,,,${totalMeters.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `machine_${machineNumber}_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(
  entries: Entry[],
  machineNumber: string,
  startDate: string,
  endDate: string,
  selectedWorkerLabel?: string
) {
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const avgPerEntry = entries.length > 0 ? totalMeters / entries.length : 0;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const title = `Machine ${machineNumber}`;

  const rows = entries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
      <td><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:${e.shift === 'night' ? '#ede9fe' : '#fef3c7'};color:${e.shift === 'night' ? '#6d28d9' : '#b45309'}">${e.shift === 'night' ? 'Night' : 'Day'}</span></td>
      <td><strong>${e.workerName}</strong></td>
      <td>${e.metersProduced.toFixed(2)} m</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} — Machine Report: ${startDate} to ${endDate}</title>
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
  <h1>${title}</h1>
  <div class="subtitle">Individual Machine Production Report ${selectedWorkerLabel ? `• Filtered by Worker: ${selectedWorkerLabel}` : ''}</div>
  <div class="meta">Period: ${startDate} to ${endDate} &nbsp;|&nbsp; Generated on ${dateStr} &nbsp;|&nbsp; ${entries.length} entries</div>
  <div class="cards">
    <div class="card green"><label>Total Meters</label><span>${totalMeters.toFixed(2)} m</span></div>
    <div class="card purple"><label>Total Entries</label><span>${entries.length}</span></div>
    <div class="card orange"><label>Avg per Entry</label><span>${avgPerEntry.toFixed(2)} m</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Shift</th><th>Worker</th><th>Meters</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4">TOTAL</td><td>${totalMeters.toFixed(2)} m</td></tr></tfoot>
  </table>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function MachineDetailClient({
  machineId,
  machineNumber,
  entries,
  startDate: serverStart,
  endDate: serverEnd,
}: Props) {
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Distinct workers who operated this machine
  const distinctWorkers = useMemo(() => {
    const map = new Map<string, { workerName: string; meters: number; entries: number }>();
    entries.forEach(e => {
      const key = e.workerId || e.workerName;
      const prev = map.get(key) || { workerName: e.workerName, meters: 0, entries: 0 };
      prev.meters += e.metersProduced;
      prev.entries += 1;
      map.set(key, prev);
    });
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.meters - a.meters);
  }, [entries]);

  // Filtered entries if worker filter applied
  const filteredEntries = useMemo(() => {
    if (!selectedWorker) return entries;
    return entries.filter(e => (e.workerId || e.workerName) === selectedWorker);
  }, [entries, selectedWorker]);

  const totalMeters = filteredEntries.reduce((s, e) => s + e.metersProduced, 0);
  const avgPerEntry = filteredEntries.length > 0 ? totalMeters / filteredEntries.length : 0;

  const currentWorkerObj = distinctWorkers.find(w => w.id === selectedWorker);
  const workerFilterLabel = currentWorkerObj ? currentWorkerObj.workerName : undefined;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`/admin/reports/machines/${machineId}?start=${startDate}&end=${endDate}`);
    });
  };

  return (
    <div>
      {/* Back breadcrumb */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/admin/reports/machines"
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to Machine Report
        </Link>
        <Link
          href={`/admin/reports/worker-machine?machineId=${machineId}&start=${startDate}&end=${endDate}`}
          style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          🔍 Open in Worker-Machine Report →
        </Link>
      </div>

      {/* Header */}
      <div className={tableStyles.pageHeader}>
        <div>
          <h1 className={tableStyles.pageTitle} style={{ marginBottom: '4px' }}>
            Machine {machineNumber}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Individual Machine Production Report
            {workerFilterLabel && (
              <span style={{ marginLeft: '8px', color: '#0284c7', fontWeight: 600 }}>
                • Showing Worker: {workerFilterLabel}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(filteredEntries, machineNumber, serverStart, serverEnd, workerFilterLabel)}
          >
            ⬇ Download CSV
          </button>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(filteredEntries, machineNumber, serverStart, serverEnd, workerFilterLabel)}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Filter Bar with Date + Worker selector */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '160px' }}>
            <label>Start Date</label>
            <input type="date" value={startDate} max={today} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '160px' }}>
            <label>End Date</label>
            <input type="date" value={endDate} max={today} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup} style={{ margin: 0, minWidth: '200px' }}>
            <label>Filter by Worker</label>
            <select
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="">👤 All Workers ({distinctWorkers.length})</option>
              {distinctWorkers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.workerName} — {w.meters.toFixed(1)}m
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={tableStyles.primaryButton} disabled={isPending}>
            {isPending ? 'Loading...' : 'Apply Date Filter'}
          </button>
          {selectedWorker && (
            <button
              type="button"
              className={tableStyles.cancelButton}
              onClick={() => setSelectedWorker('')}
              style={{ padding: '8px 14px' }}
            >
              Clear Worker Filter
            </button>
          )}
        </form>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', padding: '16px 24px', borderRadius: '10px', border: '1px solid #bbf7d0', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Total Meters {selectedWorker ? `(${currentWorkerObj?.workerName})` : ''}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#15803d' }}>{totalMeters.toFixed(2)} m</div>
        </div>
        <div style={{ background: '#fdf4ff', padding: '16px 24px', borderRadius: '10px', border: '1px solid #e9d5ff', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Entries</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7c3aed' }}>{filteredEntries.length}</div>
        </div>
        <div style={{ background: '#fff7ed', padding: '16px 24px', borderRadius: '10px', border: '1px solid #fed7aa', minWidth: '160px' }}>
          <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Avg per Entry</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ea580c' }}>{avgPerEntry.toFixed(2)} m</div>
        </div>
      </div>

      {/* Worker Breakdown (shown when All Workers is active) */}
      {!selectedWorker && distinctWorkers.length > 1 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              👥 Worker Breakdown: Meters Produced on Machine {machineNumber}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Operated by {distinctWorkers.length} workers in this period
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {distinctWorkers.map(w => (
              <div
                key={w.id}
                onClick={() => setSelectedWorker(w.id)}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#0284c7')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#cbd5e1')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{w.workerName}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{w.entries} shifts</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0284c7' }}>
                  {w.meters.toFixed(2)} m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period label */}
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
        📅 Showing data from{' '}
        <strong>{format(new Date(serverStart + 'T00:00:00'), 'dd MMM yyyy')}</strong> to{' '}
        <strong>{format(new Date(serverEnd + 'T00:00:00'), 'dd MMM yyyy')}</strong>
        {selectedWorker && (
          <span> • Filtered to Worker: <strong>{currentWorkerObj?.workerName}</strong></span>
        )}
      </p>

      {/* Table */}
      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Shift</th>
              <th>Worker</th>
              <th>Meters Produced</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((e, i) => (
              <tr key={e.id}>
                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: '#0f172a' }}>
                  {format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: e.shift === 'night' ? '#ede9fe' : '#fef3c7',
                    color: e.shift === 'night' ? '#6d28d9' : '#b45309',
                    border: `1px solid ${e.shift === 'night' ? '#ddd6fe' : '#fde68a'}`
                  }}>
                    {e.shift === 'night' ? '🌙 Night' : '☀️ Day'}
                  </span>
                </td>
                <td style={{ color: '#475569', fontWeight: 600 }}>{e.workerName}</td>
                <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{e.metersProduced.toFixed(2)} m</td>
              </tr>
            ))}
            {filteredEntries.length > 0 && (
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={4} style={{ color: '#0f172a' }}>TOTAL</td>
                <td style={{ color: '#0ea5e9' }}>{totalMeters.toFixed(2)} m</td>
              </tr>
            )}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                  No production entries found for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
