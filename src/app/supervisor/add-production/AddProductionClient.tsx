'use client';

import React, { useState, useEffect } from 'react';
import styles from './addProduction.module.css';
import { createProductionEntry } from '@/actions/production';
import { format } from 'date-fns';

interface WorkerData { id: string; name: string; }
interface MachineData { id: string; machineNumber: string; currentRatePerMeter: number; }

interface Props {
  workers: WorkerData[];
  machines: MachineData[];
  userId: string;
}

export default function AddProductionClient({ workers, machines, userId }: Props) {
  const [productionDate, setProductionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [machineId, setMachineId] = useState<string>('');
  const [workerId, setWorkerId] = useState<string>('');
  const [meters, setMeters] = useState<string>('');
  
  const [selectedMachineRate, setSelectedMachineRate] = useState<number | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (machineId) {
      const machine = machines.find(m => m.id === machineId);
      setSelectedMachineRate(machine?.currentRatePerMeter || null);
    } else {
      setSelectedMachineRate(null);
    }
  }, [machineId, machines]);

  useEffect(() => {
    if (meters && selectedMachineRate !== null) {
      const parsedMeters = parseFloat(meters);
      if (!isNaN(parsedMeters)) {
        setCalculatedAmount(parsedMeters * selectedMachineRate);
      } else {
        setCalculatedAmount(null);
      }
    } else {
      setCalculatedAmount(null);
    }
  }, [meters, selectedMachineRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionDate || !machineId || !workerId || !meters) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    const parsedMeters = parseFloat(meters);
    if (isNaN(parsedMeters) || parsedMeters <= 0) {
      setMessage({ type: 'error', text: 'Meters produced must be a positive number greater than 0.' });
      return;
    }
    if (!selectedMachineRate) {
      setMessage({ type: 'error', text: 'No rate set for this machine. Contact admin.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await createProductionEntry({
      workerId: workerId,
      machineId: machineId,
      productionDate: productionDate,
      metersProduced: parseFloat(meters),
      notes: undefined, // Add if you have notes, but for now match signature
    });

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Production entry saved successfully!' });
      setMachineId('');
      setWorkerId('');
      setMeters('');
      setTimeout(() => setMessage(null), 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className={styles.card}>
      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Production Date</label>
          <input 
            type="date" 
            value={productionDate} 
            onChange={e => setProductionDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            required
            className={styles.input}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Machine</label>
          <select 
            value={machineId} 
            onChange={e => setMachineId(e.target.value)}
            required
            className={styles.select}
            disabled={isSubmitting}
          >
            <option value="">Select Machine ▼</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.machineNumber}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Worker</label>
          <select 
            value={workerId} 
            onChange={e => setWorkerId(e.target.value)}
            required
            className={styles.select}
            disabled={isSubmitting}
          >
            <option value="">Select Worker ▼</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Meters Produced</label>
          <input 
            type="number" 
            step="0.01"
            min="0.01"
            value={meters} 
            onChange={e => setMeters(e.target.value)}
            required
            className={styles.input}
            placeholder="e.g. 500"
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.readOnlyGroup}>
          <div className={styles.readOnlyField}>
            <label>Current Rate</label>
            <div className={styles.valueBox}>
              {selectedMachineRate !== null ? `₹${selectedMachineRate.toFixed(3)}/meter` : '---'}
            </div>
          </div>
          
          <div className={styles.readOnlyField}>
            <label>Amount (Calculated)</label>
            <div className={styles.valueBoxAmount}>
              {calculatedAmount !== null ? `₹${calculatedAmount.toFixed(2)}` : '---'}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className={styles.saveBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Production'}
        </button>
      </form>
    </div>
  );
}
