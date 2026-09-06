'use client';

import React, { useState, useTransition } from 'react';
import tableStyles from '@/components/table.module.css';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth } from 'date-fns';
import Link from 'next/link';

export interface MachineShiftStat {
  machineId: string;
  machineNumber: string;
  active: boolean;
  dayMeters: number;
  dayRuns: number;
  nightMeters: number;
  nightRuns: number;
  totalMeters: number;
  totalRuns: number;
}

interface Props {
  machineStats: MachineShiftStat[];
  totalDayMeters: number;
  totalDayRuns: number;
  totalNightMeters: number;
  totalNightRuns: number;
  startDate: string;
  endDate: string;
}

function downloadCSV(
  stats: MachineShiftStat[],
  totalDayMeters: number,
  totalDayRuns: number,
  totalNightMeters: number,
  totalNightRuns: number,
  startDate: string,
  endDate: string
) {
  const headers = [
    'Machine No.',
    'Day Meters',
    'Day Shifts',
    'Night Meters',
    'Night Shifts',
    'Total Meters',
    'Total Shifts',
    'Day %',
    'Night %',
    'Status',
  ];

  const rows = stats.map(m => {
    const dayPct = m.totalMeters > 0 ? ((m.dayMeters / m.totalMeters) * 100).toFixed(1) : '0.0';
    const nightPct = m.totalMeters > 0 ? ((m.nightMeters / m.totalMeters) * 100).toFixed(1) : '0.0';
    const status =
      m.dayRuns > 0 && m.nightRuns === 0 ? 'Night Idle' :
      m.nightRuns > 0 && m.dayRuns === 0 ? 'Day Idle' :
      'Active Both';

    return [
      m.machineNumber,
      m.dayMeters.toFixed(2),
      m.dayRuns,
      m.nightMeters.toFixed(2),
      m.nightRuns,
      m.totalMeters.toFixed(2),
      m.totalRuns,
      `${dayPct}%`,
      `${nightPct}%`,
      status,
    ];
  });

  const totalAllMeters = totalDayMeters + totalNightMeters;
  const totalAllRuns = totalDayRuns + totalNightRuns;

  const csvContent = [
    `Shift Performance & Efficiency Report`,
    `Period: ${startDate} to ${endDate}`,
    `Day Total: ${totalDayMeters.toFixed(2)}m (${totalDayRuns} shifts) | Night Total: ${totalNightMeters.toFixed(2)}m (${totalNightRuns} shifts)`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TOTAL,${totalDayMeters.toFixed(2)},${totalDayRuns},${totalNightMeters.toFixed(2)},${totalNightRuns},${totalAllMeters.toFixed(2)},${totalAllRuns},,,`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shift_comparison_report_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(
  stats: MachineShiftStat[],
  totalDayMeters: number,
  totalDayRuns: number,
  totalNightMeters: number,
  totalNightRuns: number,
  startDate: string,
  endDate: string
) {
  const totalAllMeters = totalDayMeters + totalNightMeters;
  const dayPct = totalAllMeters > 0 ? ((totalDayMeters / totalAllMeters) * 100).toFixed(1) : '0';
  const nightPct = totalAllMeters > 0 ? ((totalNightMeters / totalAllMeters) * 100).toFixed(1) : '0';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = stats.map((m, i) => {
    const dPct = m.totalMeters > 0 ? ((m.dayMeters / m.totalMeters) * 100).toFixed(0) : '0';
    const nPct = m.totalMeters > 0 ? ((m.nightMeters / m.totalMeters) * 100).toFixed(0) : '0';
    return `
    <tr>
      <td>${i + 1}</td>
      <td><strong>Machine ${m.machineNumber}</strong></td>
      <td style="color:#0284c7;font-weight:600">${m.dayMeters.toFixed(2)} m (${m.dayRuns}s)</td>
      <td style="color:#7c3aed;font-weight:600">${m.nightMeters.toFixed(2)} m (${m.nightRuns}s)</td>
      <td style="font-weight:700">${m.totalMeters.toFixed(2)} m</td>
      <td>${dPct}% Day / ${nPct}% Night</td>
    </tr>
  `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shift Comparison Report: ${startDate} to ${endDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .brand { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    .cards { display: flex; gap: 16px; margin-bottom: 20px; }
    .card { padding: 12px 18px; border-radius: 8px; flex: 1; }
    .card label { font-size: 9px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; }
    .card span { font-size: 18px; font-weight: 700; }
    .card.blue { background: #f0f9ff; border: 1px solid #bae6fd; }
    .card.blue label { color: #0369a1; } .card.blue span { color: #0284c7; }
    .card.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
    .card.purple label { color: #7e22ce; } .card.purple span { color: #7c3aed; }
    .card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .card.green label { color: #166534; } .card.green span { color: #15803d; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1e293b; color: white; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    tfoot tr { background: #f1f5f9; font-weight: 700; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="brand">Shyam Textile</div>
  <h1>Shift Performance & Efficiency Report</h1>
  <div class="meta">Period: ${startDate} to ${endDate} | Generated on ${dateStr}</div>
  <div class="cards">
    <div class="card blue"><label>☀️ Day Shift Output</label><span>${totalDayMeters.toFixed(2)} m</span> (${dayPct}%)</div>
    <div class="card purple"><label>🌙 Night Shift Output</label><span>${totalNightMeters.toFixed(2)} m</span> (${nightPct}%)</div>
    <div class="card green"><label>Total Output</label><span>${totalAllMeters.toFixed(2)} m</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Machine</th>
        <th>☀️ Day Shift</th>
        <th>🌙 Night Shift</th>
        <th>Total Output</th>
        <th>Split Ratio</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL</td>
        <td style="color:#0284c7">${totalDayMeters.toFixed(2)} m</td>
        <td style="color:#7c3aed">${totalNightMeters.toFixed(2)} m</td>
        <td colspan="2">${totalAllMeters.toFixed(2)} m</td>
      </tr>
    </tfoot>
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

export default function ShiftReportClient({
  machineStats,
  totalDayMeters,
  totalDayRuns,
  totalNightMeters,
  totalNightRuns,
  startDate: serverStart,
  endDate: serverEnd,
}: Props) {
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const totalAllMeters = totalDayMeters + totalNightMeters;
  const totalAllRuns = totalDayRuns + totalNightRuns;

  const dayPct = totalAllMeters > 0 ? (totalDayMeters / totalAllMeters) * 100 : 0;
  const nightPct = totalAllMeters > 0 ? (totalNightMeters / totalAllMeters) * 100 : 0;

  const avgPerDayRun = totalDayRuns > 0 ? totalDayMeters / totalDayRuns : 0;
  const avgPerNightRun = totalNightRuns > 0 ? totalNightMeters / totalNightRuns : 0;

  // Identify machines that ran in day but had 0 night runs
  const nightIdleMachines = machineStats.filter(m => m.dayRuns > 0 && m.nightRuns === 0);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      router.push(`/admin/reports/shifts?${params.toString()}`);
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
      params.set('start', s);
      params.set('end', e);
      router.push(`/admin/reports/shifts?${params.toString()}`);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className={tableStyles.pageHeader}>
        <div>
          <h1 className={tableStyles.pageTitle}>Shift Comparison & Efficiency</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Compare Day Shift vs Night Shift meter production and machine capacity utilization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(machineStats, totalDayMeters, totalDayRuns, totalNightMeters, totalNightRuns, serverStart, serverEnd)}
          >
            ⬇ Download CSV
          </button>
          <button
            type="button"
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(machineStats, totalDayMeters, totalDayRuns, totalNightMeters, totalNightRuns, serverStart, serverEnd)}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Date Filter Card */}
      <div className={tableStyles.filterCard}>
        <form onSubmit={handleApplyFilter}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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

          {/* Quick Presets & Submit */}
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
            <button
              type="submit"
              disabled={isPending}
              className={tableStyles.primaryButton}
              style={{ padding: '9px 18px', fontSize: '14px' }}
            >
              {isPending ? 'Filtering...' : '🔍 Apply Filter'}
            </button>
          </div>
        </form>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Day Shift Output */}
        <div style={{ background: '#fffdf5', padding: '20px', borderRadius: '12px', border: '1px solid #fef08a', borderTop: '4px solid #eab308' }}>
          <div style={{ fontSize: '12px', color: '#a16207', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            ☀️ Day Shift Output
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#854d0e' }}>
            {totalDayMeters.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600 }}>m</span>
          </div>
          <div style={{ fontSize: '12px', color: '#a16207', marginTop: '6px' }}>
            {totalDayRuns} shifts logged • Avg <strong>{avgPerDayRun.toFixed(1)} m</strong> / shift
          </div>
        </div>

        {/* Night Shift Output */}
        <div style={{ background: '#faf5ff', padding: '20px', borderRadius: '12px', border: '1px solid #e9d5ff', borderTop: '4px solid #9333ea' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            🌙 Night Shift Output
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#6b21a8' }}>
            {totalNightMeters.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600 }}>m</span>
          </div>
          <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '6px' }}>
            {totalNightRuns} shifts logged • Avg <strong>{avgPerNightRun.toFixed(1)} m</strong> / shift
          </div>
        </div>

        {/* Total & Shift Ratio */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderTop: '4px solid #0ea5e9' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Overall Output & Ratio
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>
            {totalAllMeters.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 600 }}>m</span>
          </div>
          {/* Ratio bar */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              <span style={{ color: '#0284c7' }}>☀️ Day: {dayPct.toFixed(1)}%</span>
              <span style={{ color: '#7e22ce' }}>🌙 Night: {nightPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${dayPct}%`, background: '#38bdf8', height: '100%' }} />
              <div style={{ width: `${nightPct}%`, background: '#c084fc', height: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Night Idle Advisory Banner */}
      {nightIdleMachines.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '24px' }}>🌙</span>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '14px' }}>
              Unused Night Capacity Detected ({nightIdleMachines.length} machines)
            </div>
            <div style={{ color: '#b45309', fontSize: '13px', marginTop: '2px' }}>
              The following machines produced meters during Day shifts but recorded 0 meters at Night:{' '}
              {nightIdleMachines.map(m => (
                <strong key={m.machineId} style={{ marginRight: '6px' }}>Machine {m.machineNumber}</strong>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Machine Shift Breakdown Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          ⚙️ Machine-by-Machine Shift Breakdown
        </h2>
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {machineStats.length} machines
        </span>
      </div>

      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Machine</th>
              <th>☀️ Day Shift</th>
              <th>🌙 Night Shift</th>
              <th>Total Meters</th>
              <th>Shift Distribution</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {machineStats.map(m => {
              const mDayPct = m.totalMeters > 0 ? (m.dayMeters / m.totalMeters) * 100 : 0;
              const mNightPct = m.totalMeters > 0 ? (m.nightMeters / m.totalMeters) * 100 : 0;

              return (
                <tr key={m.machineId}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    Machine {m.machineNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0284c7' }}>{m.dayMeters.toFixed(2)} m</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{m.dayRuns} runs (avg {(m.dayRuns > 0 ? m.dayMeters / m.dayRuns : 0).toFixed(1)}m)</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#7e22ce' }}>{m.nightMeters.toFixed(2)} m</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{m.nightRuns} runs (avg {(m.nightRuns > 0 ? m.nightMeters / m.nightRuns : 0).toFixed(1)}m)</div>
                  </td>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>
                    {m.totalMeters.toFixed(2)} m
                  </td>
                  <td style={{ minWidth: '140px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>
                      <span>☀️ {mDayPct.toFixed(0)}%</span>
                      <span>🌙 {mNightPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${mDayPct}%`, background: '#38bdf8', height: '100%' }} />
                      <div style={{ width: `${mNightPct}%`, background: '#c084fc', height: '100%' }} />
                    </div>
                  </td>
                  <td>
                    {m.dayRuns > 0 && m.nightRuns === 0 ? (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                        🌙 Night Idle
                      </span>
                    ) : m.nightRuns > 0 && m.dayRuns === 0 ? (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        ☀️ Day Idle
                      </span>
                    ) : m.totalRuns > 0 ? (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                        ✓ Both Shifts
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Inactive</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/admin/reports/worker-machine?machineId=${m.machineId}&start=${serverStart}&end=${serverEnd}`}
                      className={tableStyles.actionButton}
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      Inspect Logs
                    </Link>
                  </td>
                </tr>
              );
            })}
            {machineStats.length > 0 && (
              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <td>TOTAL</td>
                <td style={{ color: '#0284c7' }}>{totalDayMeters.toFixed(2)} m</td>
                <td style={{ color: '#7e22ce' }}>{totalNightMeters.toFixed(2)} m</td>
                <td>{totalAllMeters.toFixed(2)} m</td>
                <td colSpan={3}></td>
              </tr>
            )}
            {machineStats.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No shift production entries found for this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
