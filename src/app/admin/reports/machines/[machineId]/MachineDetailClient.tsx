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
  workerName: string;
}

interface Props {
  machineId: string;
  machineNumber: string;
  machineName: string;
  entries: Entry[];
  startDate: string;
  endDate: string;
}

function downloadCSV(
  entries: Entry[],
  machineNumber: string,
  machineName: string,
  startDate: string,
  endDate: string
) {
  const headers = ['Date', 'Worker', 'Rate (₹/m)', 'Meters', 'Amount (₹)'];
  const rows = entries.map(e => [
    e.productionDate,
    e.workerName,
    e.rateApplied.toFixed(3),
    e.metersProduced.toFixed(2),
    e.amount.toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  const csvContent = [
    `Machine Report: ${machineNumber}${machineName ? ' - ' + machineName : ''} | ${startDate} to ${endDate}`,
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
  a.download = `machine_${machineNumber}_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MachineDetailClient({
  machineId,
  machineNumber,
  machineName,
  entries,
  startDate: serverStart,
  endDate: serverEnd,
}: Props) {
  const [startDate, setStartDate] = useState(serverStart);
  const [endDate, setEndDate] = useState(serverEnd);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const totalMeters = entries.reduce((s, e) => s + e.metersProduced, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const avgRate = entries.length > 0 ? totalAmount / totalMeters : 0;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`/admin/reports/machines/${machineId}?start=${startDate}&end=${endDate}`);
    });
  };

  return (
    <div>
      {/* Back breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/admin/reports/machines"
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to Machine Report
        </Link>
      </div>

      {/* Header */}
      <div className={tableStyles.pageHeader}>
        <div>
          <h1 className={tableStyles.pageTitle} style={{ marginBottom: '4px' }}>
            {machineNumber}
            {machineName && (
              <span style={{ fontSize: '18px', fontWeight: 500, color: '#64748b', marginLeft: '12px' }}>
                — {machineName}
              </span>
            )}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Individual Machine Production Report</p>
        </div>
        <button
          className={tableStyles.primaryButton}
          style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
          onClick={() => downloadCSV(entries, machineNumber, machineName, serverStart, serverEnd)}
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
          <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Avg Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ea580c' }}>₹{avgRate.toFixed(3)}/m</div>
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
              <th>Worker</th>
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
                <td style={{ color: '#475569' }}>{e.workerName}</td>
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
