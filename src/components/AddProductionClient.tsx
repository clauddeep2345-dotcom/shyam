'use client';

import React, { useState, useEffect } from 'react';
import styles from './addProduction.module.css';
import { createProductionEntry, checkExistingProductionEntry } from '@/actions/production';
import { format } from 'date-fns';

interface WorkerData { id: string; name: string; }
interface MachineData { id: string; machineNumber: string; currentRatePerMeter?: number; }

interface Props {
  workers: WorkerData[];
  machines: MachineData[];
  userId: string;
}

export default function AddProductionClient({ workers, machines, userId }: Props) {
  const [productionDate, setProductionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [machineId, setMachineId] = useState<string>('');
  const [workerId, setWorkerId] = useState<string>('');
  const [meters, setMeters] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingNotice, setExistingNotice] = useState<{
    metersProduced: number;
    workerName: string;
  } | null>(null);

  // Check for duplicate/existing entries on machine + date + shift change
  useEffect(() => {
    let isCurrent = true;
    if (machineId && productionDate && shift) {
      checkExistingProductionEntry({ machineId, productionDate, shift })
        .then(res => {
          if (isCurrent) {
            if (res.exists && res.entry) {
              setExistingNotice({
                metersProduced: res.entry.metersProduced,
                workerName: res.entry.workerName,
              });
            } else {
              setExistingNotice(null);
            }
          }
        })
        .catch(() => {
          if (isCurrent) setExistingNotice(null);
        });
    } else {
      setExistingNotice(null);
    }
    return () => { isCurrent = false; };
  }, [machineId, productionDate, shift]);

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

    setIsSubmitting(true);
    setMessage(null);

    const result = await createProductionEntry({
      workerId: workerId,
      machineId: machineId,
      productionDate: productionDate,
      shift: shift,
      metersProduced: parseFloat(meters),
      notes: undefined,
    });

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Production entry saved successfully (${shift === 'day' ? 'Day' : 'Night'} Shift)!` });
      setMachineId('');
      setWorkerId('');
      setMeters('');
      setExistingNotice(null);
      setTimeout(() => setMessage(null), 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className={styles.card}>
      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.type === 'success' ? '✓ ' : '⚠️ '}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Production Date</label>
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
          <label className={styles.label}>Shift</label>
          <div className={styles.shiftToggleContainer}>
            <button
              type="button"
              onClick={() => setShift('day')}
              disabled={isSubmitting}
              className={`${styles.shiftBtn} ${shift === 'day' ? styles.shiftBtnDayActive : ''}`}
            >
              ☀️ Day Shift
            </button>
            <button
              type="button"
              onClick={() => setShift('night')}
              disabled={isSubmitting}
              className={`${styles.shiftBtn} ${shift === 'night' ? styles.shiftBtnNightActive : ''}`}
            >
              🌙 Night Shift
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Machine</label>
          <select 
            value={machineId} 
            onChange={e => setMachineId(e.target.value)}
            required
            className={styles.select}
            disabled={isSubmitting}
          >
            <option value="">Select Machine ▼</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>Machine {m.machineNumber}</option>
            ))}
          </select>
        </div>

        {existingNotice && (
          <div className={styles.noticeBanner}>
            <span className={styles.noticeIcon}>⚠️</span>
            <div>
              <strong>Existing Entry Detected:</strong> Machine {machines.find(m => m.id === machineId)?.machineNumber} already has a{' '}
              <strong>{shift === 'day' ? 'Day' : 'Night'} Shift</strong> record of{' '}
              <strong>{existingNotice.metersProduced.toFixed(2)} m</strong> (by {existingNotice.workerName}) on this date.
              <div className={styles.noticeSub}>
                Submitting will log an additional entry for this shift. If you wish to edit the previous entry instead, please use Production Logs.
              </div>
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Worker</label>
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
          <label className={styles.label}>Meters Produced</label>
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

        <button 
          type="submit" 
          className={styles.saveBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : '💾 Save Production Entry'}
        </button>
      </form>
    </div>
  );
}
