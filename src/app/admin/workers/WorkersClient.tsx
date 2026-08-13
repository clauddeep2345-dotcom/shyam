'use client';

import React, { useState } from 'react';
import styles from '@/components/table.module.css';
import Modal from '@/components/Modal';
import { createWorker, updateWorker, toggleWorkerActive, deleteWorker } from '@/actions/workers';
import type { Worker } from '@/lib/types/database';

interface Props {
  initialWorkers: Worker[];
}

export default function WorkersClient({ initialWorkers }: Props) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
  const [active, setActive] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAddModal = () => {
    setEditingWorker(null);
    setName('');
    setPhone('');
    setJoiningDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
    setActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name);
    setPhone(worker.phone || '');
    setJoiningDate(worker.joining_date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
    setActive(worker.active);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingWorker) {
        const result = await updateWorker(editingWorker.id, {
          name,
          phone: phone || null,
          active,
        });
        if (result.error) { setError(result.error); return; }
        setWorkers(workers.map(w => w.id === editingWorker.id ? { ...w, name, phone: phone || null, active } : w));
      } else {
        const result = await createWorker({
          name,
          phone: phone || null,
          joining_date: joiningDate,
        });
        if (result.error) { setError(result.error); return; }
        setWorkers([...workers, { id: result.id!, name, phone: phone || null, joining_date: joiningDate, active: true, created_at: '', updated_at: '' }]);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (worker: Worker) => {
    try {
      await toggleWorkerActive(worker.id, !worker.active);
      setWorkers(workers.map(w => w.id === worker.id ? { ...w, active: !w.active } : w));
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    const result = await deleteWorker(confirmDeleteId);
    if (result.error) {
      alert(result.error);
      setDeleteLoading(false);
      setConfirmDeleteId(null);
      setDeleteId(null);
      return;
    }
    setWorkers(workers.filter(w => w.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    setDeleteId(null);
    setDeleteLoading(false);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Workers</h1>
        <button className={styles.primaryButton} onClick={openAddModal}>+ Add Worker</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(worker => (
              <tr key={worker.id}>
                <td style={{ fontWeight: 500 }}>{worker.name}</td>
                <td>{worker.phone || '-'}</td>
                <td>{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : '-'}</td>
                <td>
                  <span className={worker.active ? styles.statusActive : styles.statusInactive}>
                    {worker.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <button className={styles.actionButton} onClick={() => openEditModal(worker)}>Edit</button>
                  <button className={styles.actionButton} onClick={() => handleToggleActive(worker)}>
                    {worker.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => setDeleteId(worker.id)}
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No workers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingWorker ? 'Edit Worker' : 'Add New Worker'}
      >
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Phone (Optional)</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          {!editingWorker && (
            <div className={styles.formGroup}>
              <label>Joining Date</label>
              <input required type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
            </div>
          )}

          {editingWorker && (
            <div className={styles.formGroup}>
              <label>Status</label>
              <select value={active ? 'active' : 'inactive'} onChange={e => setActive(e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? 'Saving...' : 'Save Worker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* First Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId && !confirmDeleteId} onClose={() => setDeleteId(null)} title="Delete Worker">
        <p style={{ color: '#475569', marginBottom: '24px', fontSize: '15px' }}>
          Are you sure you want to delete this worker?
        </p>
        <div className={styles.formActions}>
          <button className={styles.cancelButton} onClick={() => setDeleteId(null)}>Cancel</button>
          <button
            className={styles.primaryButton}
            style={{ background: '#ef4444', boxShadow: '0 4px 6px -1px rgba(239,68,68,0.2)' }}
            onClick={() => setConfirmDeleteId(deleteId)}
          >
            🗑 Yes, Delete
          </button>
        </div>
      </Modal>

      {/* Second (Final) Delete Confirmation Modal */}
      <Modal isOpen={!!confirmDeleteId} onClose={() => { setConfirmDeleteId(null); setDeleteId(null); }} title="FINAL WARNING">
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <p style={{ color: '#b91c1c', fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
            🚨 DANGER: You are about to PERMANENTLY delete this worker!
          </p>
          <p style={{ color: '#991b1b', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
            This will instantly erase ALL of their production history, payroll records, advances, and payment data forever. This action absolutely CANNOT be undone.
          </p>
        </div>
        <div className={styles.formActions}>
          <button className={styles.cancelButton} onClick={() => { setConfirmDeleteId(null); setDeleteId(null); }}>Cancel</button>
          <button
            className={styles.primaryButton}
            style={{ background: '#dc2626', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(220,38,38,0.3)' }}
            disabled={deleteLoading}
            onClick={handleDelete}
          >
            {deleteLoading ? 'Deleting...' : '🚨 YES, ERASE EVERYTHING'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
