'use client';

import React, { useState, useEffect } from 'react';
import tableStyles from './table.module.css';
import Modal from './Modal';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { updateProductionEntry, softDeleteProductionEntry } from '@/actions/production';

interface Entry {
  id: string;
  productionDate: string;
  entryDate: string;
  meters: string;
  ratePerMeter: string;
  amount: string;
  worker: { id?: string; name: string };
  machine: { id?: string; machineNumber: string };
  enteredBy?: string; // user id who entered
}

interface Props {
  initialEntries: Entry[];
  title: string;
  currentUserId?: string;
  currentUserRole?: 'admin' | 'supervisor' | 'owner';
  // For edit modal
  workers?: { id: string; name: string }[];
  machines?: { id: string; machineNumber: string; currentRatePerMeter?: number }[];
}

function downloadCSV(entries: Entry[], title: string) {
  const headers = ['Production Date', 'Entry Date', 'Worker', 'Machine', 'Rate (₹/m)', 'Meters', 'Amount (₹)'];
  const rows = entries.map(e => [
    e.productionDate,
    e.entryDate || '',
    e.worker.name,
    e.machine.machineNumber,
    parseFloat(e.ratePerMeter).toFixed(3),
    parseFloat(e.meters).toFixed(2),
    parseFloat(e.amount).toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + parseFloat(e.meters), 0);
  const totalAmount = entries.reduce((s, e) => s + parseFloat(e.amount), 0);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `Total Meters,${totalMeters.toFixed(2)}`,
    `Total Amount (₹),${totalAmount.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(entries: Entry[], title: string) {
  const totalMeters = entries.reduce((s, e) => s + parseFloat(e.meters), 0);
  const totalAmount = entries.reduce((s, e) => s + parseFloat(e.amount), 0);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = entries.map(e => `
    <tr>
      <td>${format(new Date(e.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
      <td>${e.entryDate ? format(new Date(e.entryDate + 'T00:00:00'), 'dd MMM yyyy') : '—'}</td>
      <td>${e.worker.name}</td>
      <td>${e.machine.machineNumber}</td>
      <td>${parseFloat(e.ratePerMeter).toFixed(3)}</td>
      <td>${parseFloat(e.meters).toFixed(2)}</td>
      <td>₹${parseFloat(e.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated on ${dateStr} &nbsp;|&nbsp; ${entries.length} entries</div>
  <table>
    <thead>
      <tr>
        <th>Production Date</th>
        <th>Entry Date</th>
        <th>Worker</th>
        <th>Machine</th>
        <th>Rate (₹/m)</th>
        <th>Meters</th>
        <th>Amount (₹)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="total-item"><label>Total Meters</label><span>${totalMeters.toFixed(2)} m</span></div>
    <div class="total-item"><label>Total Value</label><span>₹${totalAmount.toFixed(2)}</span></div>
    <div class="total-item"><label>Total Entries</label><span>${entries.length}</span></div>
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

export default function ProductionListClient({
  initialEntries,
  title,
  currentUserId,
  currentUserRole,
  workers = [],
  machines = [],
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterLoading, setFilterLoading] = useState(false);
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // FIX: sync local state whenever server re-renders with new initialEntries (after filter navigation)
  useEffect(() => {
    setEntries(initialEntries);
    setFilterLoading(false);
  }, [initialEntries]);

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editWorker, setEditWorker] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMeters, setEditMeters] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEditDelete = currentUserRole === 'admin' || currentUserRole === 'supervisor';

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFilterLoading(true);
    router.push(`?start=${startDate}&end=${endDate}`);
    // filterLoading will reset after useEffect fires with new initialEntries
  };

  const totalMeters = entries.reduce((sum, e) => sum + parseFloat(e.meters), 0);
  const totalAmount = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const openEdit = (entry: Entry) => {
    setEditEntry(entry);
    setEditWorker(entry.worker.id || '');
    setEditMachine(entry.machine.id || '');
    setEditDate(entry.productionDate);
    setEditMeters(parseFloat(entry.meters).toString());
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;
    const m = parseFloat(editMeters);
    if (isNaN(m) || m <= 0) {
      setEditError('Meters must be a positive number.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const result = await updateProductionEntry(editEntry.id, {
      workerId: editWorker || undefined,
      machineId: editMachine || undefined,
      productionDate: editDate || undefined,
      metersProduced: m,
    });
    if (result.error) {
      setEditError(result.error);
      setEditLoading(false);
      return;
    }
    // Optimistically update local state
    setEntries(prev => prev.map(en => {
      if (en.id !== editEntry.id) return en;
      const workerObj = workers.find(w => w.id === editWorker);
      const machineObj = machines.find(mc => mc.id === editMachine);
      const rate = machineObj?.currentRatePerMeter ?? parseFloat(en.ratePerMeter);
      return {
        ...en,
        productionDate: editDate || en.productionDate,
        meters: m.toString(),
        amount: (m * rate).toFixed(2),
        worker: { id: editWorker, name: workerObj?.name || en.worker.name },
        machine: { id: editMachine, machineNumber: machineObj?.machineNumber || en.machine.machineNumber },
      };
    }));
    setIsEditOpen(false);
    setEditLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    const result = await softDeleteProductionEntry(id);
    if (result.error) {
      alert(result.error);
      setDeleteLoading(false);
      setDeleteId(null);
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeleteId(null);
    setDeleteLoading(false);
  };

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>{title}</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
            onClick={() => downloadCSV(entries, title)}
          >
            ⬇ Download CSV
          </button>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#dc2626', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.2)' }}
            onClick={() => downloadPDF(entries, title)}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={tableStyles.formGroup} style={{ margin: 0, flex: '1 1 140px' }}>
            <label>Start Date</label>
            <input type="date" value={startDate} max={today} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup} style={{ margin: 0, flex: '1 1 140px' }}>
            <label>End Date</label>
            <input type="date" value={endDate} max={today} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <button type="submit" className={tableStyles.primaryButton} style={{ flex: '0 0 auto', alignSelf: 'flex-end' }} disabled={filterLoading}>
            {filterLoading ? 'Filtering...' : 'Apply Filter'}
          </button>
        </form>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', padding: '14px 20px', borderRadius: '10px', border: '1px solid #bbf7d0', flex: '1 1 130px', minWidth: '0' }}>
          <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Meters</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#15803d', wordBreak: 'break-all' }}>{totalMeters.toFixed(2)} m</div>
        </div>
        <div style={{ background: '#eff6ff', padding: '14px 20px', borderRadius: '10px', border: '1px solid #bfdbfe', flex: '1 1 130px', minWidth: '0' }}>
          <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Value</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb', wordBreak: 'break-all' }}>₹{totalAmount.toFixed(2)}</div>
        </div>
        <div style={{ background: '#f8fafc', padding: '14px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '1 1 130px', minWidth: '0' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Entries</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{entries.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Production Date</th>
              <th>Entry Date</th>
              <th>Worker</th>
              <th>Machine</th>
              <th>Rate (₹/m)</th>
              <th>Meters</th>
              <th>Amount (₹)</th>
              {canEditDelete && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td style={{ fontWeight: 600 }}>{format(new Date(entry.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
                <td style={{ color: '#64748b', fontSize: '13px' }}>
                  {entry.entryDate ? format(new Date(entry.entryDate + 'T00:00:00'), 'dd MMM yyyy') : '—'}
                </td>
                <td>{entry.worker.name}</td>
                <td>{entry.machine.machineNumber}</td>
                <td>{parseFloat(entry.ratePerMeter).toFixed(3)}</td>
                <td style={{ fontWeight: 600 }}>{parseFloat(entry.meters).toFixed(2)}</td>
                <td style={{ fontWeight: 600, color: '#16a34a' }}>{parseFloat(entry.amount).toFixed(2)}</td>
                {canEditDelete && (
                  <td>
                    {workers.length > 0 && (
                      <button className={tableStyles.actionButton} onClick={() => openEdit(entry)}>✏️ Edit</button>
                    )}
                    <button
                      className={`${tableStyles.actionButton} ${tableStyles.deleteButton}`}
                      onClick={() => setDeleteId(entry.id)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={canEditDelete ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No production records found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Production Entry">
        <form onSubmit={handleEditSubmit}>
          {editError && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{editError}</div>}

          {editWorker !== undefined && workers.length > 0 && (
            <div className={tableStyles.formGroup}>
              <label>Worker</label>
              <select value={editWorker} onChange={e => setEditWorker(e.target.value)} required>
                <option value="">Select Worker</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          {editMachine !== undefined && machines.length > 0 && (
            <div className={tableStyles.formGroup}>
              <label>Machine</label>
              <select value={editMachine} onChange={e => setEditMachine(e.target.value)} required>
                <option value="">Select Machine</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.machineNumber}</option>)}
              </select>
            </div>
          )}

          <div className={tableStyles.formGroup}>
            <label>Production Date</label>
            <input type="date" value={editDate} max={today} onChange={e => setEditDate(e.target.value)} required />
          </div>

          <div className={tableStyles.formGroup}>
            <label>Meters Produced</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={editMeters}
              onChange={e => setEditMeters(e.target.value)}
              required
            />
          </div>

          <div className={tableStyles.formActions}>
            <button type="button" className={tableStyles.cancelButton} onClick={() => setIsEditOpen(false)}>Cancel</button>
            <button type="submit" className={tableStyles.primaryButton} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
        <p style={{ color: '#475569', marginBottom: '24px', fontSize: '15px' }}>
          Are you sure you want to delete this production entry? This action cannot be undone.
        </p>
        <div className={tableStyles.formActions}>
          <button className={tableStyles.cancelButton} onClick={() => setDeleteId(null)}>Cancel</button>
          <button
            className={tableStyles.primaryButton}
            style={{ background: '#ef4444', boxShadow: '0 4px 6px -1px rgba(239,68,68,0.2)' }}
            disabled={deleteLoading}
            onClick={() => deleteId && handleDelete(deleteId)}
          >
            {deleteLoading ? 'Deleting...' : '🗑 Yes, Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
