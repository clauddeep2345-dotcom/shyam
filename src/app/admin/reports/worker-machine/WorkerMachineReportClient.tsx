'use client';

import React, { useState, useTransition } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth } from 'date-fns';
import Link from 'next/link';

export interface ReportEntry {
  id: string;
  productionDate: string;
  shift: 'day' | 'night';
  entryDate?: string;
  metersProduced: number;
  workerId: string;
  workerName: string;
  machineId: string;
  machineNumber: string;
}

interface WorkerOption {
  id: string;
  name: string;
  active?: boolean;
}

interface MachineOption {
  id: string;
  machineNumber: string;
  active?: boolean;
}

interface Props {
  initialEntries: ReportEntry[];
  workers: WorkerOption[];
  machines: MachineOption[];
  selectedWorkerId: string;
  selectedMachineId: string;
  selectedShift: string;
  startDate: string;
  endDate: string;
}

function downloadCSV(
  entries: ReportEntry[],
  workerLabel: string,
  machineLabel: string,
  shiftLabel: string,
  startDate: string,
  endDate: string
) {
  const headers = ['Date', 'Shift', 'Worker', 'Machine', 'Meters Produced'];
  const rows = entries.map(e => [
    e.productionDate,
    e.shift === 'night' ? 'Night' : 'Day',
    `"${e.workerName.replace(/"/g, '""')}"`,
    e.machineNumber,
    e.metersProduced.toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);

  const csvContent = [
    `Worker-Machine Production Report`,
    `Worker: ${workerLabel} | Machine: ${machineLabel} | Shift: ${shiftLabel}`,
    `Date Period: ${startDate} to ${endDate}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TOTAL,,,,${totalMeters.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worker_machine_report_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(
  entries: ReportEntry[],
  workerLabel: string,
  machineLabel: string,
  shiftLabel: string,
  startDate: string,
  endDate: string
) {
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const avgPerEntry = entries.length > 0 ? totalMeters / entries.length : 0;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = entries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
      <td><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:${e.shift === 'night' ? '#ede9fe' : '#fef3c7'};color:${e.shift === 'night' ? '#6d28d9' : '#b45309'}">${e.shift === 'night' ? 'Night' : 'Day'}</span></td>
      <td><strong>${e.workerName}</strong></td>
      <td><strong>${e.machineNumber}</strong></td>
      <td style="color:#0284c7;font-weight:700">${e.metersProduced.toFixed(2)} m</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Worker-Machine Production Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .brand { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #334155; font-weight: 600; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    .badge-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155; }
    .cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .card { padding: 12px 18px; border-radius: 8px; min-width: 140px; }
    .card label { font-size: 9px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; }
    .card span { font-size: 18px; font-weight: 700; }
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
  <div class="brand">Shyam Textile</div>
  <h1>Worker-Machine Production Report</h1>
  <div class="badge-bar">
    <div class="badge">Worker: ${workerLabel}</div>
    <div class="badge">Machine: ${machineLabel}</div>
    <div class="badge">Shift: ${shiftLabel}</div>
    <div class="badge">Period: ${startDate} to ${endDate}</div>
  </div>
  <div class="meta">Report generated on ${dateStr} | Total Records: ${entries.length}</div>
  <div class="cards">
    <div class="card green"><label>Total Meters Produced</label><span>${totalMeters.toFixed(2)} m</span></div>
    <div class="card purple"><label>Total Shifts / Entries</label><span>${entries.length}</span></div>
    <div class="card orange"><label>Avg Meters / Shift</label><span>${avgPerEntry.toFixed(2)} m</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Shift</th><th>Worker</th><th>Machine</th><th>Meters</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="5">TOTAL</td><td style="color:#0284c7">${totalMeters.toFixed(2)} m</td></tr></tfoot>
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

export default function WorkerMachineReportClient({
  initialEntries,
  workers,
  machines,
  selectedWorkerId: serverWorkerId,
  selectedMachineId: serverMachineId,
  selectedShift: serverShift,
  startDate: serverStart,
  endDate: serverEnd,
}: Props) {
  const [workerId, setWorkerId] = useState(serverWorkerId);
  const [machineId, setMachineId] = useState(serverMachineId);
  const [shift, setShift] = useState(serverShift);
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const totalMeters = initialEntries.reduce((s, e) => s + e.metersProduced, 0);
  const totalEntries = initialEntries.length;
  const avgPerEntry = totalEntries > 0 ? totalMeters / totalEntries : 0;

  const currentWorker = workers.find(w => w.id === workerId);
  const currentMachine = machines.find(m => m.id === machineId);

  const workerLabel = currentWorker ? currentWorker.name : 'All Workers';
  const machineLabel = currentMachine ? `Machine ${currentMachine.machineNumber}` : 'All Machines';
  const shiftLabel = shift === 'day' ? '☀️ Day Shift' : shift === 'night' ? '🌙 Night Shift' : 'All Shifts';

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (workerId) params.set('workerId', workerId);
      if (machineId) params.set('machineId', machineId);
      if (shift) params.set('shift', shift);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      router.push(`/admin/reports/worker-machine?${params.toString()}`);
    });
  };

  const handleQuickPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | '30days') => {
    const now = new Date();
    let s = today;
    let e = today;

    if (preset === 'today') {
      s = today;
      e = today;
    } else if (preset === 'yesterday') {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      s = y;
      e = y;
    } else if (preset === 'week') {
      s = format(subDays(now, 7), 'yyyy-MM-dd');
      e = today;
    } else if (preset === 'month') {
      s = format(startOfMonth(now), 'yyyy-MM-dd');
      e = today;
    } else if (preset === '30days') {
      s = format(subDays(now, 30), 'yyyy-MM-dd');
      e = today;
    }

    setStartDate(s);
    setEndDate(e);

    startTransition(() => {
      const params = new URLSearchParams();
      if (workerId) params.set('workerId', workerId);
      if (machineId) params.set('machineId', machineId);
      if (shift) params.set('shift', shift);
      params.set('start', s);
      params.set('end', e);
      router.push(`/admin/reports/worker-machine?${params.toString()}`);
    });
  };

  const handleReset = () => {
    const defaultS = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    setWorkerId('');
    setMachineId('');
    setShift('');
    setStartDate(defaultS);
    setEndDate(today);
    startTransition(() => {
      router.push(`/admin/reports/worker-machine?start=${defaultS}&end=${today}`);
    });
  };

  // Machine breakdown for a specific worker
  const machineBreakdown = React.useMemo(() => {
    if (!workerId || machineId) return [];
    const map = new Map<string, { machineNumber: string; meters: number; entries: number }>();
    initialEntries.forEach(e => {
      const key = e.machineId;
      const prev = map.get(key) || { machineNumber: e.machineNumber, meters: 0, entries: 0 };
      prev.meters += e.metersProduced;
      prev.entries += 1;
      map.set(key, prev);
    });
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.meters - a.meters);
  }, [initialEntries, workerId, machineId]);

  // Worker breakdown for a specific machine
  const workerBreakdown = React.useMemo(() => {
    if (!machineId || workerId) return [];
    const map = new Map<string, { workerName: string; meters: number; entries: number }>();
    initialEntries.forEach(e => {
      const key = e.workerId;
      const prev = map.get(key) || { workerName: e.workerName, meters: 0, entries: 0 };
      prev.meters += e.metersProduced;
      prev.entries += 1;
      map.set(key, prev);
    });
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.meters - a.meters);
  }, [initialEntries, workerId, machineId]);

  // Matrix combination breakdown if both are "All"
  const comboBreakdown = React.useMemo(() => {
    if (workerId || machineId) return [];
    const map = new Map<string, { workerId: string; workerName: string; machineId: string; machineNumber: string; meters: number; entries: number }>();
    initialEntries.forEach(e => {
      const key = `${e.workerId}_${e.machineId}`;
      const prev = map.get(key) || {
        workerId: e.workerId,
        workerName: e.workerName,
        machineId: e.machineId,
        machineNumber: e.machineNumber,
        meters: 0,
        entries: 0,
      };
      prev.meters += e.metersProduced;
      prev.entries += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.meters - a.meters);
  }, [initialEntries, workerId, machineId]);

  return (
    <div>
      {/* Header */}
      <div className={tableStyles.pageHeader}>
        <div>
          <h1 className={tableStyles.pageTitle}>Worker & Machine Report</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Find out how many meters a worker produced on any machine in a custom date range and shift.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(initialEntries, workerLabel, machineLabel, shiftLabel, serverStart, serverEnd)}
          >
            ⬇ Download CSV
          </button>
          <button
            type="button"
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(initialEntries, workerLabel, machineLabel, shiftLabel, serverStart, serverEnd)}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className={tableStyles.filterCard}>
        <form onSubmit={handleApplyFilter}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Worker dropdown */}
            <div className={tableStyles.formGroup} style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Select Worker</label>
              <select
                value={workerId}
                onChange={e => setWorkerId(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px' }}
              >
                <option value="">👤 All Workers</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.active === false ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Machine dropdown (only machine number!) */}
            <div className={tableStyles.formGroup} style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Select Machine</label>
              <select
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px' }}
              >
                <option value="">⚙️ All Machines</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    Machine {m.machineNumber} {m.active === false ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift dropdown */}
            <div className={tableStyles.formGroup} style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Select Shift</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px' }}
              >
                <option value="">☀️ / 🌙 All Shifts</option>
                <option value="day">☀️ Day Shift</option>
                <option value="night">🌙 Night Shift</option>
              </select>
            </div>

            {/* Start Date */}
            <div className={tableStyles.formGroup} style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                max={today}
                onChange={e => setStartDate(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px' }}
              />
            </div>

            {/* End Date */}
            <div className={tableStyles.formGroup} style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                max={today}
                onChange={e => setEndDate(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px' }}
              />
            </div>
          </div>

          {/* Date presets & Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset('today')}
                className={tableStyles.presetButton}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('yesterday')}
                className={tableStyles.presetButton}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('week')}
                className={tableStyles.presetButton}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('month')}
                className={tableStyles.presetButton}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('30days')}
                className={tableStyles.presetButton}
              >
                Last 30 Days
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleReset}
                className={tableStyles.cancelButton}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Reset
              </button>
              <button
                type="submit"
                className={tableStyles.primaryButton}
                disabled={isPending}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {isPending ? 'Searching...' : '🔍 Apply Filter'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Active Scope Badge */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active Filters:</span>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>
            👤 Worker: {workerLabel}
          </span>
          <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>
            ⚙️ Machine: {machineLabel}
          </span>
          {shift && (
            <span style={{
              background: shift === 'night' ? '#ede9fe' : '#fef3c7',
              color: shift === 'night' ? '#6d28d9' : '#b45309',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700
            }}>
              {shift === 'night' ? '🌙 Night Shift' : '☀️ Day Shift'}
            </span>
          )}
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
            📅 {format(new Date(serverStart + 'T00:00:00'), 'dd MMM yyyy')} to {format(new Date(serverEnd + 'T00:00:00'), 'dd MMM yyyy')}
          </span>
        </div>
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {totalEntries} production {totalEntries === 1 ? 'entry' : 'entries'} found
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {/* Total Meters */}
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)', borderTop: '4px solid #16a34a', minWidth: '220px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Total Meters Produced
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {totalMeters.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600, color: '#16a34a' }}>m</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#166534', marginTop: '6px' }}>
            {workerId && machineId ? `Produced by ${workerLabel} on ${machineLabel}` : 'Across filtered criteria'}
          </div>
        </div>

        {/* Total Entries / Shifts */}
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)', borderTop: '4px solid #9333ea', minWidth: '180px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Total Shifts / Entries
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {totalEntries}
          </div>
          <div style={{ fontSize: '12.5px', color: '#7e22ce', marginTop: '6px' }}>
            Logged production runs
          </div>
        </div>

        {/* Avg per Entry */}
        <div className={tableStyles.statBox} style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)', borderTop: '4px solid #ea580c', minWidth: '180px', flex: '1' }}>
          <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Avg Meters / Shift
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ea580c', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {avgPerEntry.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600, color: '#ea580c' }}>m</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#c2410c', marginTop: '6px' }}>
            Average output per shift
          </div>
        </div>
      </div>

      {/* ── Case B: Specific Worker selected, All Machines -> Show Machine Breakdown ── */}
      {workerId && !machineId && machineBreakdown.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              ⚙️ Machine Breakdown for {workerLabel}
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Operated {machineBreakdown.length} {machineBreakdown.length === 1 ? 'machine' : 'machines'}
            </span>
          </div>
          <div className={tableStyles.tableContainer}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Machine Number</th>
                  <th>Shifts</th>
                  <th>Total Meters</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {machineBreakdown.map(mb => (
                  <tr key={mb.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{mb.machineNumber}</td>
                    <td>{mb.entries}</td>
                    <td style={{ fontWeight: 700, color: '#15803d' }}>{mb.meters.toFixed(2)} m</td>
                    <td>
                      <button
                        type="button"
                        className={tableStyles.actionButton}
                        onClick={() => {
                          setMachineId(mb.id);
                          startTransition(() => {
                            const p = new URLSearchParams();
                            p.set('workerId', workerId);
                            p.set('machineId', mb.id);
                            if (shift) p.set('shift', shift);
                            p.set('start', startDate);
                            p.set('end', endDate);
                            router.push(`/admin/reports/worker-machine?${p.toString()}`);
                          });
                        }}
                      >
                        Focus Machine
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Case C: Specific Machine selected, All Workers -> Show Worker Breakdown ── */}
      {machineId && !workerId && workerBreakdown.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              👥 Worker Breakdown for {machineLabel}
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Operated by {workerBreakdown.length} {workerBreakdown.length === 1 ? 'worker' : 'workers'}
            </span>
          </div>
          <div className={tableStyles.tableContainer}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Shifts</th>
                  <th>Total Meters</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workerBreakdown.map(wb => (
                  <tr key={wb.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{wb.workerName}</td>
                    <td>{wb.entries}</td>
                    <td style={{ fontWeight: 700, color: '#15803d' }}>{wb.meters.toFixed(2)} m</td>
                    <td>
                      <button
                        type="button"
                        className={tableStyles.actionButton}
                        onClick={() => {
                          setWorkerId(wb.id);
                          startTransition(() => {
                            const p = new URLSearchParams();
                            p.set('workerId', wb.id);
                            p.set('machineId', machineId);
                            if (shift) p.set('shift', shift);
                            p.set('start', startDate);
                            p.set('end', endDate);
                            router.push(`/admin/reports/worker-machine?${p.toString()}`);
                          });
                        }}
                      >
                        Focus Worker
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Case D: Both "All Workers" & "All Machines" -> Show Combination Ranking ── */}
      {!workerId && !machineId && comboBreakdown.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              🧵 Worker & Machine Pairings Summary
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Top active pairings by meters produced
            </span>
          </div>
          <div className={tableStyles.tableContainer}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Machine</th>
                  <th>Shifts</th>
                  <th>Total Meters</th>
                  <th>Avg / Shift</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {comboBreakdown.slice(0, 10).map((cb) => (
                  <tr key={`${cb.workerId}_${cb.machineId}`}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{cb.workerName}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{cb.machineNumber}</span>
                    </td>
                    <td>{cb.entries}</td>
                    <td style={{ fontWeight: 700, color: '#0ea5e9' }}>{cb.meters.toFixed(2)} m</td>
                    <td>{(cb.meters / cb.entries).toFixed(2)} m</td>
                    <td>
                      <button
                        type="button"
                        className={tableStyles.actionButton}
                        onClick={() => {
                          setWorkerId(cb.workerId);
                          setMachineId(cb.machineId);
                          startTransition(() => {
                            const p = new URLSearchParams();
                            p.set('workerId', cb.workerId);
                            p.set('machineId', cb.machineId);
                            if (shift) p.set('shift', shift);
                            p.set('start', startDate);
                            p.set('end', endDate);
                            router.push(`/admin/reports/worker-machine?${p.toString()}`);
                          });
                        }}
                      >
                        Inspect Pair
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Production Entries Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          📋 Production Log Entries
        </h2>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {initialEntries.length} {initialEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Production Date</th>
              <th>Shift</th>
              <th>Worker</th>
              <th>Machine</th>
              <th>Meters Produced</th>
            </tr>
          </thead>
          <tbody>
            {initialEntries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ fontWeight: 600, color: '#0f172a' }}>
                  {format(new Date(entry.productionDate + 'T00:00:00'), 'dd MMM yyyy')}
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
                    background: entry.shift === 'night' ? '#ede9fe' : '#fef3c7',
                    color: entry.shift === 'night' ? '#6d28d9' : '#b45309',
                    border: `1px solid ${entry.shift === 'night' ? '#ddd6fe' : '#fde68a'}`
                  }}>
                    {entry.shift === 'night' ? '🌙 Night' : '☀️ Day'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>
                  <Link
                    href={`/admin/reports/workers/${entry.workerId}?start=${startDate}&end=${endDate}`}
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                  >
                    {entry.workerName}
                  </Link>
                </td>
                <td>
                  <Link
                    href={`/admin/reports/machines/${entry.machineId}?start=${startDate}&end=${endDate}`}
                    style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}
                  >
                    {entry.machineNumber}
                  </Link>
                </td>
                <td style={{ fontWeight: 700, color: '#0ea5e9' }}>
                  {entry.metersProduced.toFixed(2)} m
                </td>
              </tr>
            ))}
            {initialEntries.length > 0 && (
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={5} style={{ color: '#0f172a' }}>TOTAL</td>
                <td style={{ color: '#0ea5e9' }}>{totalMeters.toFixed(2)} m</td>
              </tr>
            )}
            {initialEntries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
                  No production records found matching this worker, machine, and date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
