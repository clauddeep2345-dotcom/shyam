'use client';

import React, { useState } from 'react';
import styles from '@/components/table.module.css';
import Modal from '@/components/Modal';
import { createMachine, updateMachine } from '@/actions/machines';
import type { Machine } from '@/lib/types/database';

type MachineWithRate = Machine & { current_rate?: number | null };

interface Props {
  initialMachines: MachineWithRate[];
}

export default function MachinesClient({ initialMachines }: Props) {
  const [machines, setMachines] = useState<MachineWithRate[]>(initialMachines);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineWithRate | null>(null);

  // Add Machine form
  const [machineNumber, setMachineNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openAddForm = () => {
    setEditingMachine(null);
    setMachineNumber('');
    setError('');
    setIsFormOpen(true);
  };

  const openEditForm = (machine: MachineWithRate) => {
    setEditingMachine(machine);
    setMachineNumber(machine.machine_number);
    setError('');
    setIsFormOpen(true);
  };

  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (editingMachine) {
      const result = await updateMachine(editingMachine.id, { machine_number: machineNumber, name: machineNumber });
      if (result.error) { setError(result.error); setLoading(false); return; }
      setMachines(machines.map(m => m.id === editingMachine.id ? { ...m, machine_number: machineNumber, name: machineNumber } : m));
    } else {
      const result = await createMachine({ machine_number: machineNumber, name: machineNumber });
      if (result.error) { setError(result.error); setLoading(false); return; }
      setMachines([...machines, { id: result.id!, machine_number: machineNumber, name: machineNumber, active: true, current_rate: null, created_at: '', updated_at: '' }]);
    }
    
    setIsFormOpen(false);
    setMachineNumber('');
    setLoading(false);
  };

  const handleToggle = async (machine: MachineWithRate) => {
    await updateMachine(machine.id, { active: !machine.active });
    setMachines(machines.map(m => m.id === machine.id ? { ...m, active: !m.active } : m));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Machines</h1>
        <button className={styles.primaryButton} onClick={openAddForm}>+ Add Machine</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Machine No.</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {machines.map(machine => (
              <tr key={machine.id}>
                <td style={{ fontWeight: 600 }}>{machine.machine_number}</td>
                <td>
                  <span className={machine.active ? styles.statusActive : styles.statusInactive}>
                    {machine.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.actionButton}
                    onClick={() => openEditForm(machine)}
                  >
                    Edit
                  </button>
                  <button className={styles.actionButton} onClick={() => handleToggle(machine)}>
                    {machine.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>No machines found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingMachine ? "Edit Machine" : "Add Machine"}>
        <form onSubmit={handleSaveMachine}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <div className={styles.formGroup}>
            <label>Machine Number</label>
            <input required type="text" value={machineNumber} onChange={e => setMachineNumber(e.target.value)} placeholder="e.g. M-01" />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsFormOpen(false)}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? 'Saving...' : (editingMachine ? 'Save Changes' : 'Add Machine')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
