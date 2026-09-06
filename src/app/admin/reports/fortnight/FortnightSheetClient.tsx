'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerFortnightData, type WorkerFortnightData } from '@/actions/fortnight';
import styles from './fortnight.module.css';

interface WorkerOption {
  id: string;
  name: string;
}

interface Props {
  workers: WorkerOption[];
  initialData: WorkerFortnightData | null;
  selectedWorkerId: string;
  selectedYear: number;
  selectedMonth: number;
  selectedPeriod: '1-15' | '16-end';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FortnightSheetClient({
  workers,
  initialData,
  selectedWorkerId,
  selectedYear,
  selectedMonth,
  selectedPeriod,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [workerId, setWorkerId] = useState(selectedWorkerId);
  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(selectedMonth);
  const [period, setPeriod] = useState<'1-15' | '16-end'>(selectedPeriod);
  const [data, setData] = useState<WorkerFortnightData | null>(initialData);

  const fetchData = (newWorkerId: string, newYear: number, newMonth: number, newPeriod: '1-15' | '16-end') => {
    startTransition(async () => {
      router.push(`?workerId=${newWorkerId}&year=${newYear}&month=${newMonth}&period=${newPeriod}`);
      const res = await getWorkerFortnightData({
        workerId: newWorkerId,
        year: newYear,
        month: newMonth,
        period: newPeriod,
      });
      setData(res);
    });
  };

  const handleWorkerChange = (newWorkerId: string) => {
    setWorkerId(newWorkerId);
    fetchData(newWorkerId, year, month, period);
  };

  const handlePeriodChange = (newPeriod: '1-15' | '16-end') => {
    setPeriod(newPeriod);
    fetchData(workerId, year, month, newPeriod);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // 'YYYY-MM'
    if (!val) return;
    const [y, m] = val.split('-').map(Number);
    setYear(y);
    setMonth(m);
    fetchData(workerId, y, m, period);
  };

  const handlePrevMonth = () => {
    let newM = month - 1;
    let newY = year;
    if (newM < 1) { newM = 12; newY -= 1; }
    setMonth(newM);
    setYear(newY);
    fetchData(workerId, newY, newM, period);
  };

  const handleNextMonth = () => {
    let newM = month + 1;
    let newY = year;
    if (newM > 12) { newM = 1; newY += 1; }
    setMonth(newM);
    setYear(newY);
    fetchData(workerId, newY, newM, period);
  };

  const downloadCSV = () => {
    if (!data) return;

    const headers = ['Machine', ...data.days.map(d => `Day ${d}`), 'Total (Meters)'];
    const rows: (string | number)[][] = [];

    // Machine rows
    data.machines.forEach(m => {
      const row = [
        `Machine ${m.machineNumber}`,
        ...data.days.map(d => m.dailyMeters[d] ? m.dailyMeters[d].toFixed(2) : '0.00'),
        m.totalMeters.toFixed(2),
      ];
      rows.push(row);
    });

    // Daily totals row
    const totalRow = [
      'Daily Total',
      ...data.days.map(d => data.dailyTotals[d] ? data.dailyTotals[d].toFixed(2) : '0.00'),
      data.grandTotal.toFixed(2),
    ];
    rows.push(totalRow);

    const csvContent = [
      `Worker: ${data.workerName}`,
      `Period: ${period === '1-15' ? '1st to 15th' : '16th to Month End'} (${MONTH_NAMES[month - 1]} ${year})`,
      `Grand Total: ${data.grandTotal.toFixed(2)} meters`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.workerName.replace(/\s+/g, '_')}_Fortnight_${period}_${MONTH_NAMES[month - 1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthInputValue = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>15-Day Worker Production Sheet</h1>
          <p className={styles.subtitle}>
            Machine-by-machine production matrix for 1st–15th and 16th–Month End
          </p>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.btnSecondary} onClick={() => window.print()} title="Print sheet">
            🖨️ Print Sheet
          </button>
          <button className={styles.btnSecondary} onClick={downloadCSV} disabled={!data || data.machines.length === 0}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Control Card */}
      <div className={styles.controlCard}>
        <div className={styles.controlsRow}>
          {/* Worker Selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Select Worker</label>
            <select
              className={styles.select}
              value={workerId}
              onChange={e => handleWorkerChange(e.target.value)}
              disabled={isPending}
            >
              <option value="">Select Worker ▼</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Month & Year */}
          <div className={styles.fieldGroup} style={{ minWidth: '180px' }}>
            <label className={styles.fieldLabel}>Month & Year</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: '8px 12px' }}
                onClick={handlePrevMonth}
                disabled={isPending}
              >
                ◀
              </button>
              <input
                type="month"
                className={styles.monthInput}
                value={monthInputValue}
                onChange={handleMonthChange}
                disabled={isPending}
              />
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: '8px 12px' }}
                onClick={handleNextMonth}
                disabled={isPending}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Period Cycle Toggle */}
          <div className={styles.fieldGroup} style={{ minWidth: '280px' }}>
            <label className={styles.fieldLabel}>Fortnight Cycle</label>
            <div className={styles.periodSegment}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${period === '1-15' ? styles.segmentActive : ''}`}
                onClick={() => handlePeriodChange('1-15')}
                disabled={isPending}
              >
                ☀️ 1st to 15th
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${period === '16-end' ? styles.segmentActive : ''}`}
                onClick={() => handlePeriodChange('16-end')}
                disabled={isPending}
              >
                🌙 16th to End
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
            <div className={styles.kpiLabel}>Period Total Output</div>
            <div className={styles.kpiValue}>{data.grandTotal.toFixed(2)} m</div>
            <div className={styles.kpiSub}>
              {period === '1-15' ? '1st–15th' : '16th–End'} {MONTH_NAMES[month - 1]} {year}
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
            <div className={styles.kpiLabel}>Machines Operated</div>
            <div className={styles.kpiValue}>{data.activeMachinesCount}</div>
            <div className={styles.kpiSub}>Active machines in this cycle</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
            <div className={styles.kpiLabel}>Active Working Days</div>
            <div className={styles.kpiValue}>{data.activeDaysCount} / {data.days.length}</div>
            <div className={styles.kpiSub}>Days with recorded meters</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiAmber}`}>
            <div className={styles.kpiLabel}>Shift Output Split</div>
            <div className={styles.kpiValue} style={{ fontSize: '18px' }}>
              ☀️ {data.dayShiftTotal.toFixed(0)} m | 🌙 {data.nightShiftTotal.toFixed(0)} m
            </div>
            <div className={styles.kpiSub}>
              {data.grandTotal > 0
                ? `${Math.round((data.dayShiftTotal / data.grandTotal) * 100)}% Day / ${Math.round((data.nightShiftTotal / data.grandTotal) * 100)}% Night`
                : 'No production'}
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <h2 className={styles.tableTitle}>
            {data ? `${data.workerName} — ${period === '1-15' ? '1st to 15th' : '16th to End'} (${MONTH_NAMES[month - 1]} ${year})` : 'Production Matrix'}
          </h2>
          {data && (
            <span className={styles.periodBadge}>
              {data.startDate} to {data.endDate}
            </span>
          )}
        </div>

        {!workerId ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>👤</span>
            <h3>Select a worker above</h3>
            <p>Choose any worker to view their 15-day machine production matrix.</p>
          </div>
        ) : !data || data.machines.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🧵</span>
            <h3>No production entries found</h3>
            <p>
              No meters recorded for this worker between {period === '1-15' ? '1st and 15th' : '16th and month end'} of {MONTH_NAMES[month - 1]} {year}.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={styles.machineColHeader}>Machine</th>
                  {data.days.map(d => (
                    <th key={d} style={{ minWidth: '46px', textAlign: 'center' }}>
                      {String(d).padStart(2, '0')}
                    </th>
                  ))}
                  <th className={styles.totalColHeader}>Total (m)</th>
                </tr>
              </thead>
              <tbody>
                {data.machines.map(m => (
                  <tr key={m.machineId}>
                    <td className={styles.machineColCell}>
                      Machine {m.machineNumber}
                    </td>
                    {data.days.map(d => {
                      const val = m.dailyMeters[d];
                      const shifts = m.dailyShifts[d];
                      const hasDay = shifts && shifts.day > 0;
                      const hasNight = shifts && shifts.night > 0;

                      return (
                        <td
                          key={d}
                          className={val > 0 ? `${styles.cellActive} ${styles.cellTooltip}` : styles.cellMuted}
                          style={{ textAlign: 'center' }}
                          title={val > 0 ? `Day ${d}: ${val.toFixed(2)} m${hasDay ? ` (☀️ ${shifts.day.toFixed(1)}m)` : ''}${hasNight ? ` (🌙 ${shifts.night.toFixed(1)}m)` : ''}` : undefined}
                        >
                          {val > 0 ? val.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                    <td className={styles.totalColCell}>
                      {m.totalMeters.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.footerRow}>
                  <td className={styles.machineColHeader} style={{ fontWeight: 800 }}>
                    Daily Total
                  </td>
                  {data.days.map(d => (
                    <td key={d} style={{ textAlign: 'center', fontWeight: 700 }}>
                      {data.dailyTotals[d] > 0 ? data.dailyTotals[d].toFixed(1) : '—'}
                    </td>
                  ))}
                  <td className={`${styles.totalColHeader} ${styles.grandTotalCell}`}>
                    {data.grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
