'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { DashboardStats } from '@/lib/dashboard';
import styles from './liveDashboard.module.css';

interface Props {
  stats: DashboardStats;
}

export default function LiveFactoryDashboard({ stats }: Props) {
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [fleetFilter, setFleetFilter] = useState<'all' | 'running' | 'idle'>('all');

  // Maximum meters in the 7-day trend for scaling
  const maxDayMeters = Math.max(
    ...stats.sevenDayTrend.map(d => d.totalMeters),
    100
  );

  // Guarantee natural alphanumeric sort: 1..64, then A..D
  const sortedFleet = useMemo(() => {
    return [...stats.fleet].sort((a, b) => {
      const aNum = parseInt(a.machineNumber, 10);
      const bNum = parseInt(b.machineNumber, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else if (!isNaN(aNum)) {
        return -1;
      } else if (!isNaN(bNum)) {
        return 1;
      }
      return a.machineNumber.localeCompare(b.machineNumber, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [stats.fleet]);

  // Filter fleet based on selected tab
  const displayedFleet = useMemo(() => {
    if (fleetFilter === 'running') return sortedFleet.filter(m => m.isRunning);
    if (fleetFilter === 'idle') return sortedFleet.filter(m => !m.isRunning);
    return sortedFleet;
  }, [sortedFleet, fleetFilter]);

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.topBanner}>
        <div>
          <h2 className={styles.bannerTitle}>
            <span className={styles.pulseDot} />
            <span>Factory Floor Live Overview</span>
          </h2>
          <p className={styles.bannerSubtitle}>
            Real-time daily output and machine fleet activity for <strong>{stats.todayDateStr}</strong>
          </p>
        </div>

        {stats.topWorkerToday && (
          <div className={styles.topWorkerCard}>
            <span style={{ fontSize: '22px' }}>🏆</span>
            <div>
              <div className={styles.topWorkerBadge}>
                Top Producer Today
              </div>
              <div className={styles.topWorkerName}>
                {stats.topWorkerToday.name} —{' '}
                <span style={{ color: '#0284c7', fontFamily: 'var(--font-mono)' }}>{stats.topWorkerToday.meters.toFixed(1)} m</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {/* Total Today */}
        <div className={`${styles.kpiCard} ${styles.kpiAccentTotal}`}>
          <div className={styles.kpiLabel}>
            Today's Total Meters
          </div>
          <div className={styles.kpiValue}>
            {stats.todayTotal.toFixed(2)}
            <span className={styles.kpiUnit}>m</span>
          </div>
          <div className={styles.kpiSub} style={{ color: '#0284c7' }}>
            {stats.todayEntriesCount} production {stats.todayEntriesCount === 1 ? 'entry' : 'entries'} today
          </div>
        </div>

        {/* Day Shift */}
        <div className={`${styles.kpiCard} ${styles.kpiAccentDay}`}>
          <div className={styles.kpiLabel} style={{ color: '#b45309' }}>
            <span>☀️</span> Day Shift
          </div>
          <div className={styles.kpiValue} style={{ color: '#92400e' }}>
            {stats.dayTotal.toFixed(2)}
            <span className={styles.kpiUnit} style={{ color: '#d97706' }}>m</span>
          </div>
          <div className={styles.kpiSub} style={{ color: '#b45309' }}>
            {stats.dayCount} machine run{stats.dayCount === 1 ? '' : 's'} recorded
          </div>
        </div>

        {/* Night Shift */}
        <div className={`${styles.kpiCard} ${styles.kpiAccentNight}`}>
          <div className={styles.kpiLabel} style={{ color: '#7e22ce' }}>
            <span>🌙</span> Night Shift
          </div>
          <div className={styles.kpiValue} style={{ color: '#6b21a8' }}>
            {stats.nightTotal.toFixed(2)}
            <span className={styles.kpiUnit} style={{ color: '#a855f7' }}>m</span>
          </div>
          <div className={styles.kpiSub} style={{ color: '#7e22ce' }}>
            {stats.nightCount} machine run{stats.nightCount === 1 ? '' : 's'} recorded
          </div>
        </div>

        {/* Fleet Utilization */}
        <div className={`${styles.kpiCard} ${styles.kpiAccentFleet}`}>
          <div className={styles.kpiLabel}>
            Active Machines Today
          </div>
          <div className={styles.kpiValue} style={{ color: '#15803d' }}>
            {stats.runningCount}
            <span className={styles.kpiUnit} style={{ fontSize: '20px', color: '#94a3b8' }}> / {stats.fleet.length}</span>
          </div>
          <div className={styles.kpiSub} style={{ color: stats.idleCount > 0 ? '#ea580c' : '#16a34a' }}>
            {stats.idleCount > 0 ? `⚠️ ${stats.idleCount} machine${stats.idleCount === 1 ? '' : 's'} idle today` : '✓ All machines active'}
          </div>
        </div>
      </div>

      {/* Fleet Status Tags & 7-Day Chart Row */}
      <div className={styles.panelsGrid}>
        {/* Machine Status Breakdown */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>
                <span>⚙️</span> Machine Fleet Status
              </h3>
              <span className={styles.panelSubtitle}>
                {stats.fleet.length} active machines • {stats.runningCount} running, {stats.idleCount} idle
              </span>
            </div>

            <div className={styles.fleetFilterGroup}>
              <button
                type="button"
                onClick={() => setFleetFilter('all')}
                className={`${styles.filterBtn} ${fleetFilter === 'all' ? styles.filterBtnActive : ''}`}
              >
                All ({stats.fleet.length})
              </button>
              <button
                type="button"
                onClick={() => setFleetFilter('running')}
                className={`${styles.filterBtn} ${fleetFilter === 'running' ? styles.filterBtnActiveGreen : ''}`}
              >
                <span className={styles.fleetDotRunning} /> Running ({stats.runningCount})
              </button>
              <button
                type="button"
                onClick={() => setFleetFilter('idle')}
                className={`${styles.filterBtn} ${fleetFilter === 'idle' ? styles.filterBtnActiveGray : ''}`}
              >
                <span className={styles.fleetDotIdle} /> Idle ({stats.idleCount})
              </button>
            </div>
          </div>

          <div className={styles.fleetContainer}>
            {displayedFleet.map(m => (
              <Link
                key={m.id}
                href={`/admin/reports/machines/${m.id}`}
                title={`Machine ${m.machineNumber}: ${m.isRunning ? `${m.metersToday.toFixed(1)}m produced today` : 'Idle today'}`}
                className={`${styles.fleetChip} ${m.isRunning ? styles.fleetChipRunning : styles.fleetChipIdle}`}
              >
                <div className={styles.fleetChipLeft}>
                  <span className={m.isRunning ? styles.fleetDotRunning : styles.fleetDotIdle} />
                  <span className={styles.fleetChipTitle}>Machine {m.machineNumber}</span>
                </div>
                {m.isRunning ? (
                  <strong className={styles.fleetMeterValue}>{m.metersToday.toFixed(0)}m</strong>
                ) : (
                  <span className={styles.fleetIdleText}>Idle</span>
                )}
              </Link>
            ))}
            {displayedFleet.length === 0 && (
              <div className={styles.fleetEmpty}>
                No {fleetFilter} machines found today.
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Production Trend Chart */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <span>📈</span> 7-Day Production Trend
            </h3>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem} style={{ color: '#0284c7' }}>
                <span style={{ width: '10px', height: '10px', background: '#38bdf8', borderRadius: '3px' }} />
                Day
              </span>
              <span className={styles.legendItem} style={{ color: '#7e22ce' }}>
                <span style={{ width: '10px', height: '10px', background: '#c084fc', borderRadius: '3px' }} />
                Night
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className={styles.chartContainer}>
            {stats.sevenDayTrend.map((day, idx) => {
              const heightPct = maxDayMeters > 0 ? (day.totalMeters / maxDayMeters) * 100 : 0;
              const dayPortionPct = day.totalMeters > 0 ? (day.dayMeters / day.totalMeters) * 100 : 0;
              const isHovered = activeBarIdx === idx;

              return (
                <div
                  key={day.date}
                  className={styles.barCol}
                  onMouseEnter={() => setActiveBarIdx(idx)}
                  onMouseLeave={() => setActiveBarIdx(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className={styles.barTooltip}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{day.totalMeters.toFixed(1)} m</div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                        ☀️ {day.dayMeters.toFixed(0)}m • 🌙 {day.nightMeters.toFixed(0)}m
                      </div>
                    </div>
                  )}

                  {/* Stacked Bar */}
                  <div
                    className={`${styles.barTrack} ${isHovered ? styles.barTrackHover : ''}`}
                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                  >
                    {/* Day shift portion (bottom) */}
                    <div
                      className={styles.daySegment}
                      style={{ height: `${dayPortionPct}%` }}
                    />
                    {/* Night shift portion (top) */}
                    <div className={styles.nightSegment} />
                  </div>

                  {/* Day Label */}
                  <span className={`${styles.dayLabel} ${isHovered ? styles.dayLabelActive : ''}`}>
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
