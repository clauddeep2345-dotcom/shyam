'use client';
import React, { useState } from 'react';
import type { DashboardStats } from '@/lib/dashboard';
import styles from './liveDashboard.module.css';

interface Props {
  stats: DashboardStats;
}

export default function LiveFactoryDashboard({ stats }: Props) {
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);

  // Maximum meters in the 7-day trend for scaling
  const maxDayMeters = Math.max(
    ...stats.sevenDayTrend.map(d => d.totalMeters),
    100
  );

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
            <h3 className={styles.panelTitle}>
              <span>⚙️</span> Machine Fleet Status
            </h3>
            <span className={styles.panelSubtitle}>
              {stats.fleet.length} active machines
            </span>
          </div>

          <div className={styles.fleetContainer}>
            {stats.fleet.map(m => (
              <div
                key={m.id}
                className={`${styles.fleetChip} ${m.isRunning ? styles.fleetChipRunning : styles.fleetChipIdle}`}
              >
                <span className={m.isRunning ? styles.fleetDotRunning : styles.fleetDotIdle} />
                <span>Machine {m.machineNumber}</span>
                {m.isRunning ? (
                  <strong style={{ color: '#15803d', fontFamily: 'var(--font-mono)' }}>{m.metersToday.toFixed(0)}m</strong>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>Idle</span>
                )}
              </div>
            ))}
            {stats.fleet.length === 0 && (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>No machines registered yet.</span>
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
