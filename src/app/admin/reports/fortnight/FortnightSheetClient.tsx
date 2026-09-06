'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWorkerFortnightData,
  getAllWorkersFortnightMachineTotals,
  type WorkerFortnightData,
  type AllWorkersFortnightData,
} from '@/actions/fortnight';
import styles from './fortnight.module.css';

interface WorkerOption {
  id: string;
  name: string;
}

interface Props {
  workers: WorkerOption[];
  initialData: WorkerFortnightData | null;
  initialAllWorkersData?: AllWorkersFortnightData | null;
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
  initialAllWorkersData,
  selectedWorkerId,
  selectedYear,
  selectedMonth,
  selectedPeriod,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [workerId, setWorkerId] = useState(selectedWorkerId || (workers[0]?.id ?? 'ALL'));
  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(selectedMonth);
  const [period, setPeriod] = useState<'1-15' | '16-end'>(selectedPeriod);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  const [activeTab, setActiveTab] = useState<'matrix' | 'totals'>('matrix');
  const [printTarget, setPrintTarget] = useState<'matrix' | 'totals'>('matrix');

  const [data, setData] = useState<WorkerFortnightData | null>(initialData);
  const [allWorkersData, setAllWorkersData] = useState<AllWorkersFortnightData | null>(initialAllWorkersData || null);

  const fetchData = (newWorkerId: string, newYear: number, newMonth: number, newPeriod: '1-15' | '16-end') => {
    startTransition(async () => {
      router.push(`?workerId=${newWorkerId}&year=${newYear}&month=${newMonth}&period=${newPeriod}`);
      const [workerRes, allRes] = await Promise.all([
        newWorkerId && newWorkerId !== 'ALL'
          ? getWorkerFortnightData({ workerId: newWorkerId, year: newYear, month: newMonth, period: newPeriod })
          : null,
        getAllWorkersFortnightMachineTotals({ year: newYear, month: newMonth, period: newPeriod }),
      ]);
      setData(workerRes);
      setAllWorkersData(allRes);
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

  // 1. Print 15-Day Matrix (Landscape PDF with zero cutoff)
  const handlePrintMatrix = () => {
    setPrintTarget('matrix');
    setActiveTab('matrix');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 2. Print Machine Totals Only (for All Workers or Selected Worker)
  const handlePrintMachineTotals = () => {
    setPrintTarget('totals');
    setActiveTab('totals');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // CSV Export for Machine Totals
  const downloadTotalsCSV = () => {
    const periodLabel = period === '1-15' ? '1st to 15th' : '16th to Month End';

    if (workerId === 'ALL' && allWorkersData) {
      const headers = ['Worker Name', 'Machine', 'Total Meters Produced'];
      const rows: (string | number)[][] = [];

      allWorkersData.workers.forEach(w => {
        w.machines.forEach(m => {
          rows.push([w.workerName, `Machine ${m.machineNumber}`, m.totalMeters.toFixed(2)]);
        });
        rows.push([`Total for ${w.workerName}`, `${w.machines.length} Machines`, w.workerTotalMeters.toFixed(2)]);
        rows.push(['', '', '']); // blank spacer
      });

      rows.push(['FACTORY GRAND TOTAL', `${allWorkersData.totalMachinesOperated} Machines`, allWorkersData.grandTotalMeters.toFixed(2)]);

      const csvContent = [
        `SHYAM TEXTILE - ALL WORKERS MACHINE TOTALS`,
        `Period: ${periodLabel} (${MONTH_NAMES[month - 1]} ${year})`,
        `Date Range: ${allWorkersData.startDate} to ${allWorkersData.endDate}`,
        `Grand Total: ${allWorkersData.grandTotalMeters.toFixed(2)} meters`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `All_Workers_Machine_Totals_${period}_${MONTH_NAMES[month - 1]}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (data) {
      const headers = ['Machine', 'Total Meters Produced'];
      const rows = data.machines.map(m => [`Machine ${m.machineNumber}`, m.totalMeters.toFixed(2)]);
      rows.push([`Total (${data.machines.length} Machines)`, data.grandTotal.toFixed(2)]);

      const csvContent = [
        `SHYAM TEXTILE - Worker Machine Totals`,
        `Worker: ${data.workerName}`,
        `Period: ${periodLabel} (${MONTH_NAMES[month - 1]} ${year})`,
        `Date Range: ${data.startDate} to ${data.endDate}`,
        `Grand Total: ${data.grandTotal.toFixed(2)} meters`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${data.workerName.replace(/\s+/g, '_')}_Machine_Totals_${period}_${MONTH_NAMES[month - 1]}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // CSV Export for 15-Day Matrix
  const downloadMatrixCSV = () => {
    if (!data) return;

    const headers = ['Machine', ...data.days.map(d => `Day ${d}`), 'Total (Meters)'];
    const rows: (string | number)[][] = [];

    data.machines.forEach(m => {
      const row = [
        `Machine ${m.machineNumber}`,
        ...data.days.map(d => {
          const shifts = m.dailyShifts[d];
          if (shiftFilter === 'day') return shifts?.day ? shifts.day.toFixed(2) : '0.00';
          if (shiftFilter === 'night') return shifts?.night ? shifts.night.toFixed(2) : '0.00';
          if (shifts && shifts.day > 0 && shifts.night > 0) {
            return `${shifts.day.toFixed(1)}(D)+${shifts.night.toFixed(1)}(N)`;
          } else if (shifts && shifts.day > 0) {
            return `${shifts.day.toFixed(2)}(D)`;
          } else if (shifts && shifts.night > 0) {
            return `${shifts.night.toFixed(2)}(N)`;
          }
          return m.dailyMeters[d] ? m.dailyMeters[d].toFixed(2) : '0.00';
        }),
        (shiftFilter === 'day' ? m.totalDayMeters : shiftFilter === 'night' ? m.totalNightMeters : m.totalMeters).toFixed(2),
      ];
      rows.push(row);
    });

    const totalRow = [
      'Daily Total',
      ...data.days.map(d => {
        if (shiftFilter === 'day') return (data.dailyDayTotals?.[d] || 0).toFixed(2);
        if (shiftFilter === 'night') return (data.dailyNightTotals?.[d] || 0).toFixed(2);
        return (data.dailyTotals[d] || 0).toFixed(2);
      }),
      (shiftFilter === 'day' ? data.dayShiftTotal : shiftFilter === 'night' ? data.nightShiftTotal : data.grandTotal).toFixed(2),
    ];
    rows.push(totalRow);

    const filterText = shiftFilter === 'day' ? 'Day Shift Only' : shiftFilter === 'night' ? 'Night Shift Only' : 'All Shifts';
    const csvContent = [
      `Worker: ${data.workerName}`,
      `Period: ${period === '1-15' ? '1st to 15th' : '16th to Month End'} (${MONTH_NAMES[month - 1]} ${year})`,
      `Shift View: ${filterText}`,
      `Grand Total: ${(shiftFilter === 'day' ? data.dayShiftTotal : shiftFilter === 'night' ? data.nightShiftTotal : data.grandTotal).toFixed(2)} meters`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.workerName.replace(/\s+/g, '_')}_Fortnight_${period}_${MONTH_NAMES[month - 1]}_${year}_${shiftFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthInputValue = `${year}-${String(month).padStart(2, '0')}`;

  const currentPeriodLabel = period === '1-15' ? '1st to 15th' : '16th to Month End';
  const displayDates = data
    ? `${data.startDate} to ${data.endDate}`
    : allWorkersData
    ? `${allWorkersData.startDate} to ${allWorkersData.endDate}`
    : '';

  return (
    <div className={styles.container}>
      {/* Dedicated Clean Print Header (Appears ONLY in Print / PDF) */}
      <div className={styles.printHeader}>
        <div className={styles.printCompany}>SHYAM TEXTILE</div>
        <h1 className={styles.printTitle}>
          {printTarget === 'totals'
            ? workerId === 'ALL'
              ? '15-Day Factory Machine Totals (All Workers)'
              : `15-Day Machine Totals — ${data?.workerName || 'Worker'}`
            : `15-Day Worker Production Matrix — ${data?.workerName || 'Worker'}`}
        </h1>
        <div className={styles.printMetaRow}>
          <div>
            <span>Worker:</span>{' '}
            <strong>
              {printTarget === 'totals' && workerId === 'ALL'
                ? `All Workers (${allWorkersData?.workers.length || 0})`
                : data?.workerName || '—'}
            </strong>
          </div>
          <div>
            <span>Period:</span>{' '}
            <strong>{currentPeriodLabel} ({MONTH_NAMES[month - 1]} {year})</strong>
          </div>
          <div>
            <span>Dates:</span> <strong>{displayDates}</strong>
          </div>
          <div>
            <span>Total Production:</span>{' '}
            <strong style={{ color: '#047857' }}>
              {printTarget === 'totals' && workerId === 'ALL'
                ? (allWorkersData?.grandTotalMeters.toFixed(1) || '0.0') + ' m'
                : (data?.grandTotal.toFixed(1) || '0.0') + ' m'}
            </strong>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>15-Day Worker Production Sheet</h1>
          <p className={styles.subtitle}>
            Machine-by-machine production matrix for 1st–15th and 16th–Month End
          </p>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.btnPrintTotals}
            onClick={() => {
              setWorkerId('ALL');
              handlePrintMachineTotals();
            }}
            title="Generate & print consolidated PDF of all machine totals for ALL workers"
          >
            📊 All Workers Machine Totals (PDF)
          </button>
          <button
            type="button"
            className={styles.btnPrintMatrix}
            onClick={handlePrintMatrix}
            disabled={!data || data.machines.length === 0}
            title="Download/Print 15-Day Day-by-Day matrix for selected worker (Landscape PDF)"
          >
            🖨️ 15-Day Matrix (PDF)
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={activeTab === 'totals' ? downloadTotalsCSV : downloadMatrixCSV}
            title="Export spreadsheet"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Control Card */}
      <div className={styles.controlCard}>
        <div className={styles.controlsRow}>
          {/* Worker Selector */}
          <div className={styles.fieldGroup} style={{ minWidth: '260px' }}>
            <label className={styles.fieldLabel}>Select Worker</label>
            <select
              className={styles.select}
              value={workerId}
              onChange={e => handleWorkerChange(e.target.value)}
              disabled={isPending}
            >
              <option value="ALL">👥 ALL WORKERS (Factory Summary)</option>
              <optgroup label="Individual Workers">
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </optgroup>
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

      {/* KPI Cards (For Selected Worker) */}
      {workerId !== 'ALL' && data && (
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
            <div className={styles.kpiLabel}>Period Total Output</div>
            <div className={styles.kpiValue}>{data.grandTotal.toFixed(1)} m</div>
            <div className={styles.kpiSub}>
              {currentPeriodLabel} {MONTH_NAMES[month - 1]} {year}
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
            <div className={styles.kpiLabel}>Machines Operated</div>
            <div className={styles.kpiValue}>{data.activeMachinesCount}</div>
            <div className={styles.kpiSub}>Active machines for {data.workerName}</div>
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

      {/* KPI Cards (For Factory Summary when ALL selected) */}
      {workerId === 'ALL' && allWorkersData && (
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
            <div className={styles.kpiLabel}>Total Factory Output</div>
            <div className={styles.kpiValue}>{allWorkersData.grandTotalMeters.toLocaleString('en-IN', { maximumFractionDigits: 1 })} m</div>
            <div className={styles.kpiSub}>
              {currentPeriodLabel} {MONTH_NAMES[month - 1]} {year}
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
            <div className={styles.kpiLabel}>Active Workers</div>
            <div className={styles.kpiValue}>{allWorkersData.activeWorkersCount}</div>
            <div className={styles.kpiSub}>Workers with recorded production</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
            <div className={styles.kpiLabel}>Machines Operated</div>
            <div className={styles.kpiValue}>{allWorkersData.totalMachinesOperated}</div>
            <div className={styles.kpiSub}>Out of 68 factory machines</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiAmber}`}>
            <div className={styles.kpiLabel}>Avg Output / Worker</div>
            <div className={styles.kpiValue}>
              {allWorkersData.activeWorkersCount > 0
                ? (allWorkersData.grandTotalMeters / allWorkersData.activeWorkersCount).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' m'
                : '0 m'}
            </div>
            <div className={styles.kpiSub}>Per active worker in fortnight</div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs (Screen Only) */}
      <div className={styles.viewTabs}>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${activeTab === 'matrix' && workerId !== 'ALL' ? styles.viewTabActive : ''}`}
          onClick={() => {
            if (workerId === 'ALL' && workers.length > 0) {
              setWorkerId(workers[0].id);
              fetchData(workers[0].id, year, month, period);
            }
            setActiveTab('matrix');
            setPrintTarget('matrix');
          }}
        >
          📅 15-Day Day-by-Day Matrix
        </button>
        <button
          type="button"
          className={`${styles.viewTabBtn} ${activeTab === 'totals' ? styles.viewTabActiveTotals : ''}`}
          onClick={() => {
            setActiveTab('totals');
            setPrintTarget('totals');
          }}
        >
          📊 Machine-wise Totals Only {workerId === 'ALL' ? '(All Workers)' : `(${data?.workerName || 'Worker'})`}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. MACHINE-WISE TOTALS VIEW (Clean: Machine & Total Meters)          */}
      {/* ==================================================================== */}
      <div
        className={`${styles.tableCard} ${activeTab !== 'totals' ? styles.screenHidden : ''} ${printTarget !== 'totals' ? styles.printHidden : ''}`}
      >
        <div className={styles.tableHeaderBar}>
          <div>
            <h2 className={styles.tableTitle}>
              {workerId === 'ALL'
                ? 'All Workers — Machine-wise Output Totals'
                : `${data?.workerName || 'Worker'} — Machine-wise Output Totals`}
            </h2>
            <p className={styles.tableSubtitle}>
              Total meters produced on each machine for {currentPeriodLabel} ({MONTH_NAMES[month - 1]} {year})
            </p>
          </div>

          <div className={styles.tableHeaderActions}>
            <button
              type="button"
              className={styles.btnPrintTotals}
              onClick={handlePrintMachineTotals}
              title="Print or Save PDF"
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={downloadTotalsCSV}
              title="Export Machine Totals as CSV"
            >
              📥 Export CSV
            </button>
            <span className={styles.periodBadge}>
              {displayDates}
            </span>
          </div>
        </div>

        {/* Mode A: ALL WORKERS Machine Totals */}
        {workerId === 'ALL' && allWorkersData && (
          <div className={styles.tableWrapper}>
            <table className={styles.simpleTotalsTable}>
              <thead>
                <tr>
                  <th style={{ width: '30%', textAlign: 'left' }}>Worker Name</th>
                  <th style={{ width: '35%', textAlign: 'left' }}>Machine</th>
                  <th style={{ width: '35%', textAlign: 'right' }}>Total Meters Produced</th>
                </tr>
              </thead>
              <tbody>
                {allWorkersData.workers.map(wGroup => {
                  return (
                    <React.Fragment key={wGroup.workerId}>
                      {wGroup.machines.map((m, mIdx) => (
                        <tr key={`${wGroup.workerId}-${m.machineId}`}>
                          {mIdx === 0 ? (
                            <td
                              rowSpan={wGroup.machines.length + 1}
                              className={styles.workerNameGroupCell}
                            >
                              <div className={styles.workerNameText}>
                                <span style={{ fontSize: '16px' }}>👤</span>
                                <span>{wGroup.workerName}</span>
                              </div>
                              <div className={styles.workerMachCount}>
                                {wGroup.machines.length} Machines Worked
                              </div>
                            </td>
                          ) : null}
                          <td className={styles.machineCell}>
                            <strong>Machine {m.machineNumber}</strong>
                          </td>
                          <td className={styles.meterCell}>
                            {m.totalMeters.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                          </td>
                        </tr>
                      ))}
                      {/* Subtotal Row for each worker */}
                      <tr className={styles.workerSubtotalRow}>
                        <td className={styles.subtotalLabelCell}>
                          <span>Total for {wGroup.workerName}:</span>
                        </td>
                        <td className={styles.subtotalValueCell}>
                          <strong>{wGroup.workerTotalMeters.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m</strong>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.grandFactoryRow}>
                  <td colSpan={2} style={{ fontSize: '14.5px', fontWeight: 900 }}>
                    🏭 FACTORY GRAND TOTAL ({allWorkersData.activeWorkersCount} Workers, {allWorkersData.totalMachinesOperated} Machines)
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '16.5px', fontWeight: 900, color: '#047857' }}>
                    {allWorkersData.grandTotalMeters.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Mode B: INDIVIDUAL WORKER Machine Totals */}
        {workerId !== 'ALL' && data && (
          <div className={styles.tableWrapper}>
            <table className={styles.simpleTotalsTable}>
              <thead>
                <tr>
                  <th style={{ width: '45%', textAlign: 'left' }}>Machine</th>
                  <th style={{ width: '55%', textAlign: 'right' }}>Total Meters Produced</th>
                </tr>
              </thead>
              <tbody>
                {data.machines.map(m => (
                  <tr key={m.machineId}>
                    <td className={styles.machineCell}>
                      <strong>Machine {m.machineNumber}</strong>
                    </td>
                    <td className={styles.meterCell}>
                      {m.totalMeters.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.grandFactoryRow}>
                  <td style={{ fontSize: '14.5px', fontWeight: 900 }}>
                    Total for {data.workerName} ({data.machines.length} Machines)
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '16.5px', fontWeight: 900, color: '#047857' }}>
                    {data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. FULL 15-DAY DAY-BY-DAY MATRIX VIEW                                */}
      {/* ==================================================================== */}
      <div
        className={`${styles.tableCard} ${activeTab !== 'matrix' || workerId === 'ALL' ? styles.screenHidden : ''} ${printTarget !== 'matrix' ? styles.printHidden : ''}`}
      >
        <div className={styles.tableHeaderBar}>
          <h2 className={styles.tableTitle}>
            {data ? `${data.workerName} — 15-Day Production Matrix (${currentPeriodLabel}, ${MONTH_NAMES[month - 1]} ${year})` : 'Production Matrix'}
          </h2>
          {data && (
            <span className={styles.periodBadge}>
              {data.startDate} to {data.endDate}
            </span>
          )}
        </div>

        {/* Shift Colors Legend & View Filter Toolbar */}
        {data && data.machines.length > 0 && (
          <div className={styles.legendToolbar}>
            <div className={styles.legendGroup}>
              <span className={styles.legendTitle}>Shift Colors:</span>
              <div className={styles.legendBadgeDay}>
                <span className={styles.legendIcon}>☀️</span>
                <span>Day Shift (Amber)</span>
              </div>
              <div className={styles.legendBadgeNight}>
                <span className={styles.legendIcon}>🌙</span>
                <span>Night Shift (Indigo)</span>
              </div>
              <div className={styles.legendBadgeBoth}>
                <span className={styles.legendIcon}>🌓</span>
                <span>Both Shifts</span>
              </div>
            </div>

            <div className={styles.shiftFilterWrapper}>
              <span className={styles.filterTitle}>View Shift:</span>
              <div className={styles.shiftFilterSegment}>
                <button
                  type="button"
                  className={`${styles.shiftFilterBtn} ${shiftFilter === 'all' ? styles.shiftFilterActive : ''}`}
                  onClick={() => setShiftFilter('all')}
                >
                  All Shifts
                </button>
                <button
                  type="button"
                  className={`${styles.shiftFilterBtn} ${shiftFilter === 'day' ? styles.shiftFilterActiveDay : ''}`}
                  onClick={() => setShiftFilter('day')}
                >
                  ☀️ Day Only
                </button>
                <button
                  type="button"
                  className={`${styles.shiftFilterBtn} ${shiftFilter === 'night' ? styles.shiftFilterActiveNight : ''}`}
                  onClick={() => setShiftFilter('night')}
                >
                  🌙 Night Only
                </button>
              </div>
            </div>
          </div>
        )}

        {!data || data.machines.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🧵</span>
            <h3>No production entries found</h3>
            <p>
              No meters recorded for this worker between {currentPeriodLabel} of {MONTH_NAMES[month - 1]} {year}.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={styles.machineColHeader}>Machine</th>
                  {data.days.map(d => (
                    <th key={d} style={{ minWidth: '54px', textAlign: 'center' }}>
                      <span className={styles.dayColNum}>{String(d).padStart(2, '0')}</span>
                    </th>
                  ))}
                  <th className={styles.totalColHeader}>Total (m)</th>
                </tr>
              </thead>
              <tbody>
                {data.machines.map(m => {
                  let displayedRowTotal = m.totalMeters;
                  if (shiftFilter === 'day') displayedRowTotal = m.totalDayMeters;
                  if (shiftFilter === 'night') displayedRowTotal = m.totalNightMeters;

                  return (
                    <tr key={m.machineId}>
                      <td className={styles.machineColCell}>
                        <div className={styles.machineLabel}>Machine {m.machineNumber}</div>
                      </td>
                      {data.days.map(d => {
                        const shifts = m.dailyShifts[d] || { day: 0, night: 0 };
                        const dayMeters = shifts.day;
                        const nightMeters = shifts.night;
                        const totalMeters = m.dailyMeters[d] || 0;

                        if (shiftFilter === 'day') {
                          if (dayMeters > 0) {
                            return (
                              <td
                                key={d}
                                className={`${styles.cellDay} ${styles.cellActive}`}
                                title={`Day ${d} (☀️ Day Shift): ${dayMeters.toFixed(2)} m`}
                              >
                                <div className={styles.cellDayInner}>
                                  <span className={styles.cellSunIcon}>☀️</span>
                                  <span className={styles.cellMeterText}>{dayMeters.toFixed(1)}</span>
                                </div>
                              </td>
                            );
                          }
                          return <td key={d} className={styles.cellMuted}>—</td>;
                        }

                        if (shiftFilter === 'night') {
                          if (nightMeters > 0) {
                            return (
                              <td
                                key={d}
                                className={`${styles.cellNight} ${styles.cellActive}`}
                                title={`Day ${d} (🌙 Night Shift): ${nightMeters.toFixed(2)} m`}
                              >
                                <div className={styles.cellNightInner}>
                                  <span className={styles.cellMoonIcon}>🌙</span>
                                  <span className={styles.cellMeterText}>{nightMeters.toFixed(1)}</span>
                                </div>
                              </td>
                            );
                          }
                          return <td key={d} className={styles.cellMuted}>—</td>;
                        }

                        // Default: shiftFilter === 'all'
                        if (dayMeters > 0 && nightMeters > 0) {
                          return (
                            <td
                              key={d}
                              className={`${styles.cellBoth} ${styles.cellActive}`}
                              title={`Day ${d}: Total ${totalMeters.toFixed(2)} m (☀️ Day: ${dayMeters.toFixed(1)}m | 🌙 Night: ${nightMeters.toFixed(1)}m)`}
                            >
                              <div className={styles.cellBothStack}>
                                <div className={styles.bothDayChip}>
                                  <span>☀️</span>
                                  <span>{dayMeters.toFixed(0)}</span>
                                </div>
                                <div className={styles.bothNightChip}>
                                  <span>🌙</span>
                                  <span>{nightMeters.toFixed(0)}</span>
                                </div>
                              </div>
                            </td>
                          );
                        } else if (dayMeters > 0) {
                          return (
                            <td
                              key={d}
                              className={`${styles.cellDay} ${styles.cellActive}`}
                              title={`Day ${d} (☀️ Day Shift): ${dayMeters.toFixed(2)} m`}
                            >
                              <div className={styles.cellDayInner}>
                                <span className={styles.cellSunIcon}>☀️</span>
                                <span className={styles.cellMeterText}>{dayMeters.toFixed(1)}</span>
                              </div>
                            </td>
                          );
                        } else if (nightMeters > 0) {
                          return (
                            <td
                              key={d}
                              className={`${styles.cellNight} ${styles.cellActive}`}
                              title={`Day ${d} (🌙 Night Shift): ${nightMeters.toFixed(2)} m`}
                            >
                              <div className={styles.cellNightInner}>
                                <span className={styles.cellMoonIcon}>🌙</span>
                                <span className={styles.cellMeterText}>{nightMeters.toFixed(1)}</span>
                              </div>
                            </td>
                          );
                        } else {
                          return <td key={d} className={styles.cellMuted}>—</td>;
                        }
                      })}
                      <td className={styles.totalColCell}>
                        <div className={styles.rowTotalVal}>{displayedRowTotal.toFixed(1)}</div>
                        {shiftFilter === 'all' && (m.totalDayMeters > 0 || m.totalNightMeters > 0) && (
                          <div className={styles.rowTotalSplit}>
                            {m.totalDayMeters > 0 && (
                              <span className={styles.splitBadgeDay} title={`Day: ${m.totalDayMeters.toFixed(2)}m`}>
                                ☀️ {m.totalDayMeters.toFixed(0)}
                              </span>
                            )}
                            {m.totalNightMeters > 0 && (
                              <span className={styles.splitBadgeNight} title={`Night: ${m.totalNightMeters.toFixed(2)}m`}>
                                🌙 {m.totalNightMeters.toFixed(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.footerRow}>
                  <td className={styles.machineColHeader} style={{ fontWeight: 800 }}>
                    Daily Total
                  </td>
                  {data.days.map(d => {
                    const dayTot = data.dailyDayTotals ? data.dailyDayTotals[d] || 0 : 0;
                    const nightTot = data.dailyNightTotals ? data.dailyNightTotals[d] || 0 : 0;
                    const total = data.dailyTotals[d] || 0;

                    if (shiftFilter === 'day') {
                      return (
                        <td key={d} className={styles.footerCellDay} style={{ textAlign: 'center' }}>
                          {dayTot > 0 ? (
                            <span className={styles.footerDayVal}>☀️ {dayTot.toFixed(1)}</span>
                          ) : '—'}
                        </td>
                      );
                    }
                    if (shiftFilter === 'night') {
                      return (
                        <td key={d} className={styles.footerCellNight} style={{ textAlign: 'center' }}>
                          {nightTot > 0 ? (
                            <span className={styles.footerNightVal}>🌙 {nightTot.toFixed(1)}</span>
                          ) : '—'}
                        </td>
                      );
                    }

                    return (
                      <td key={d} className={styles.footerCellAll} style={{ textAlign: 'center' }}>
                        {total > 0 ? (
                          <div className={styles.footerTotalBox}>
                            <span className={styles.footerTotalVal}>{total.toFixed(0)}</span>
                            {(dayTot > 0 || nightTot > 0) && (
                              <div className={styles.footerMiniSplit}>
                                {dayTot > 0 && <span className={styles.footerMiniDay}>☀️{dayTot.toFixed(0)}</span>}
                                {nightTot > 0 && <span className={styles.footerMiniNight}>🌙{nightTot.toFixed(0)}</span>}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                    );
                  })}
                  <td className={`${styles.totalColHeader} ${styles.grandTotalCell}`}>
                    <div className={styles.grandVal}>
                      {(shiftFilter === 'day' ? data.dayShiftTotal : shiftFilter === 'night' ? data.nightShiftTotal : data.grandTotal).toFixed(1)}
                    </div>
                    {shiftFilter === 'all' && (
                      <div className={styles.grandSplit}>
                        <span className={styles.splitBadgeDay}>☀️ {data.dayShiftTotal.toFixed(0)}m</span>
                        <span className={styles.splitBadgeNight}>🌙 {data.nightShiftTotal.toFixed(0)}m</span>
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Physical Sign-off Block (Visible ONLY during print/PDF) */}
      <div className={styles.printSignatures}>
        <div className={styles.signBlock}>
          <div className={styles.signLine} />
          <div>Worker Signature</div>
        </div>
        <div className={styles.signBlock}>
          <div className={styles.signLine} />
          <div>Checked By (Supervisor / Master)</div>
        </div>
        <div className={styles.signBlock}>
          <div className={styles.signLine} />
          <div>Authorized Signatory (Shyam Textile)</div>
        </div>
      </div>
    </div>
  );
}
