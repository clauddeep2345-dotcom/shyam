'use client';

import React, { useState } from 'react';
import tableStyles from '@/components/table.module.css';
import Modal from '@/components/Modal';
import { format } from 'date-fns';
import { updateProductionEntry, softDeleteProductionEntry } from '@/actions/production';

interface Entry {
  id: string;
  productionDate: string;
  shift?: 'day' | 'night';
  entryDate: string;
  meters: string;
  worker: { id: string; name: string };
  machine: { id: string; machineNumber: string };
  enteredBy: string;
}

interface Props {
  initialEntries: Entry[];
  currentUserId: string;
  workers: { id: string; name: string }[];
  machines: { id: string; machineNumber: string }[];
}

function downloadCSV(entries: Entry[]) {
  const headers = ['Production Date', 'Shift', 'Entry Date', 'Worker', 'Machine', 'Meters'];
  const rows = entries.map(e => [
    e.productionDate,
    e.shift === 'night' ? 'Night' : 'Day',
    e.entryDate ? e.entryDate.split('T')[0] : '',
    e.worker.name,
    e.machine.machineNumber,
    parseFloat(e.meters).toFixed(2),
  ]);
  const totalMeters = entries.reduce((s, e) => s + parseFloat(e.meters), 0);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `Total Meters,,,,,${totalMeters.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my_recent_entries_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecentClient({ initialEntries, currentUserId, workers, machines }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editWorker, setEditWorker] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editShift, setEditShift] = useState<'day' | 'night'>('day');
  const [editMeters, setEditMeters] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isSameDay = (entryDate: string) => entryDate.startsWith(today);
  const isMyEntry = (enteredBy: string) => enteredBy === currentUserId;

  const openEdit = (entry: Entry) => {
    setEditEntry(entry);
    setEditWorker(entry.worker.id);
    setEditMachine(entry.machine.id);
    setEditDate(entry.productionDate);
    setEditShift(entry.shift || 'day');
    setEditMeters(parseFloat(entry.meters).toString());
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;
    const m = parseFloat(editMeters);
    if (isNaN(m) || m <= 0) {
      setEditError('Meters must be a positive number greater than 0.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const result = await updateProductionEntry(editEntry.id, {
      workerId: editWorker || undefined,
      machineId: editMachine || undefined,
      productionDate: editDate || undefined,
      shift: editShift,
      metersProduced: m,
    });
    if (result.error) {
      setEditError(result.error);
      setEditLoading(false);
      return;
    }
    setEntries(prev => prev.map(en => {
      if (en.id !== editEntry.id) return en;
      const workerObj = workers.find(w => w.id === editWorker);
      const machineObj = machines.find(mc => mc.id === editMachine);
      return {
        ...en,
        productionDate: editDate || en.productionDate,
        shift: editShift,
        meters: m.toString(),
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

  const totalMeters = entries.reduce((s, e) => s + parseFloat(e.meters), 0);

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>My Recent Entries</h1>
        <button
          className={tableStyles.primaryButton}
          style={{ background: '#16a34a', boxShadow: '0 4px 6px -1px rgba(22,163,74,0.2)' }}
          onClick={() => downloadCSV(entries)}
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', padding: '16px 24px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Meters</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>{totalMeters.toFixed(2)} m</div>
        </div>
        <div style={{ background: '#fdf4ff', padding: '16px 24px', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
          <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Entries</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>{entries.length}</div>
        </div>
      </div>

      <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
        ℹ️ You can only edit or delete entries you made <strong>today</strong>.
      </p>

      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Production Date</th>
              <th>Shift</th>
              <th>Entry Time</th>
              <th>Worker</th>
              <th>Machine</th>
              <th>Meters</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const canAct = isMyEntry(entry.enteredBy) && isSameDay(entry.entryDate);
              return (
                <tr key={entry.id}>
                  <td style={{ fontWeight: 600 }}>{format(new Date(entry.productionDate + 'T00:00:00'), 'dd MMM yyyy')}</td>
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
                  <td style={{ color: '#64748b' }}>{format(new Date(entry.entryDate), 'dd MMM HH:mm')}</td>
                  <td>{entry.worker.name}</td>
                  <td>{entry.machine.machineNumber}</td>
                  <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{parseFloat(entry.meters).toFixed(2)} m</td>
                  <td>
                    {canAct ? (
                      <>
                        <button className={tableStyles.actionButton} onClick={() => openEdit(entry)}>✏️ Edit</button>
                        <button
                          className={`${tableStyles.actionButton} ${tableStyles.deleteButton}`}
                          onClick={() => setDeleteId(entry.id)}
                        >
                          🗑 Delete
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Today only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No entries found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Production Entry">
        <form onSubmit={handleEditSubmit}>
          {editError && (
            <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {editError}
            </div>
          )}
          <div className={tableStyles.formGroup}>
            <label>Worker</label>
            <select value={editWorker} onChange={e => setEditWorker(e.target.value)} required>
              <option value="">Select Worker</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className={tableStyles.formGroup}>
            <label>Machine</label>
            <select value={editMachine} onChange={e => setEditMachine(e.target.value)} required>
              <option value="">Select Machine</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.machineNumber}</option>)}
            </select>
          </div>
          <div className={tableStyles.formGroup}>
            <label>Production Date</label>
            <input type="date" value={editDate} max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())} onChange={e => setEditDate(e.target.value)} required />
          </div>
          <div className={tableStyles.formGroup}>
            <label>Shift</label>
            <select value={editShift} onChange={e => setEditShift(e.target.value as 'day' | 'night')} required>
              <option value="day">☀️ Day Shift</option>
              <option value="night">🌙 Night Shift</option>
            </select>
          </div>
          <div className={tableStyles.formGroup}>
            <label>Meters Produced</label>
            <input type="number" step="0.01" min="0.01" value={editMeters} onChange={e => setEditMeters(e.target.value)} required />
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
          Are you sure you want to delete this production entry?
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
