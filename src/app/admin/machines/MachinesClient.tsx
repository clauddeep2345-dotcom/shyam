'use client';

import React, { useState } from 'react';
import styles from '@/components/table.module.css';
import Modal from '@/components/Modal';
import { createMachine, updateMachine } from '@/actions/machines';
import { setNewRate } from '@/actions/rates';
import type { Machine } from '@/lib/types/database';

type MachineWithRate = Machine & { current_rate: number | null };

interface Props {
  initialMachines: MachineWithRate[];
}

export default function MachinesClient({ initialMachines }: Props) {
  const [machines, setMachines] = useState<MachineWithRate[]>(initialMachines);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineWithRate | null>(null);

  // Add Machine form
  const [machineNumber, setMachineNumber] = useState('');
  const [machineName, setMachineName] = useState('');

  // Set Rate form
  const [newRate, setNewRate_] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createMachine({ machine_number: machineNumber, name: machineName });
    if (result.error) { setError(result.error); setLoading(false); return; }
    setMachines([...machines, { id: result.id!, machine_number: machineNumber, name: machineName, active: true, current_rate: null, created_at: '', updated_at: '' }]);
    setIsAddOpen(false);
    setMachineNumber('');
    setMachineName('');
    setLoading(false);
  };

  const handleSetRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setLoading(true);
    setError('');
    const result = await setNewRate({
      machineId: selectedMachine.id,
      ratePerMeter: parseFloat(newRate),
      effectiveFrom,
    });
    if (result.error) { setError(result.error); setLoading(false); return; }
    setMachines(machines.map(m => m.id === selectedMachine.id ? { ...m, current_rate: parseFloat(newRate) } : m));
    setIsRateOpen(false);
    setLoading(false);
  };

  const handleToggle = async (machine: MachineWithRate) => {
    await updateMachine(machine.id, { active: !machine.active });
    setMachines(machines.map(m => m.id === machine.id ? { ...m, active: !m.active } : m));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Machines & Rates</h1>
        <button className={styles.primaryButton} onClick={() => setIsAddOpen(true)}>+ Add Machine</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Machine No.</th>
              <th>Name</th>
              <th>Current Rate (₹/m)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {machines.map(machine => (
              <tr key={machine.id}>
                <td style={{ fontWeight: 600 }}>{machine.machine_number}</td>
                <td>{machine.name}</td>
                <td style={{ fontWeight: 600, color: '#16a34a' }}>
                  {machine.current_rate !== null ? `₹${machine.current_rate.toFixed(3)}` : '—'}
                </td>
                <td>
                  <span className={machine.active ? styles.statusActive : styles.statusInactive}>
                    {machine.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.actionButton}
                    onClick={() => { setSelectedMachine(machine); setNewRate_(''); setEffectiveFrom(new Date().toISOString().split('T')[0]); setError(''); setIsRateOpen(true); }}
                  >
                    Set Rate
                  </button>
                  <button className={styles.actionButton} onClick={() => handleToggle(machine)}>
                    {machine.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No machines found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Machine">
        <form onSubmit={handleAddMachine}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <div className={styles.formGroup}>
            <label>Machine Number</label>
            <input required type="text" value={machineNumber} onChange={e => setMachineNumber(e.target.value)} placeholder="e.g. M-01" />
          </div>
          <div className={styles.formGroup}>
            <label>Name / Description</label>
            <input required type="text" value={machineName} onChange={e => setMachineName(e.target.value)} placeholder="e.g. Loom 1" />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsAddOpen(false)}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? 'Saving...' : 'Add Machine'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRateOpen} onClose={() => setIsRateOpen(false)} title={`Set Rate — ${selectedMachine?.machine_number}`}>
        <form onSubmit={handleSetRate}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <div className={styles.formGroup}>
            <label>Rate per Meter (₹)</label>
            <input required type="number" step="0.001" min="0" value={newRate} onChange={e => setNewRate_(e.target.value)} placeholder="e.g. 2.500" />
          </div>
          <div className={styles.formGroup}>
            <label>Effective From</label>
            <input required type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsRateOpen(false)}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? 'Saving...' : 'Set Rate'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
