'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createProductionEntry, getExistingEntriesForDateAndShift } from '@/actions/production';
import { format } from 'date-fns';
import styles from './bulkAddProduction.module.css';

interface WorkerData { id: string; name: string; }
interface MachineData { id: string; machineNumber: string; currentRatePerMeter?: number; }

interface Props {
  workers: WorkerData[];
  machines: MachineData[];
  userId?: string;
  // workerId -> array of assigned machineIds
  workerAssignments: Record<string, string[]>;
}

interface MachineRow {
  machine: MachineData;
  meters: string;
  status: 'idle' | 'success' | 'error' | 'skipped';
  errorMsg?: string;
}

export default function BulkAddProductionClient({ workers, machines, userId, workerAssignments }: Props) {
  const [productionDate, setProductionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [workerId, setWorkerId] = useState<string>('');
  const [machineRows, setMachineRows] = useState<MachineRow[]>([]);
  const [existingEntriesMap, setExistingEntriesMap] = useState<Record<string, { metersProduced: number; workerName: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Fetch already logged entries for this date & shift to highlight duplicates
  useEffect(() => {
    let isCurrent = true;
    if (productionDate && shift) {
      getExistingEntriesForDateAndShift({ productionDate, shift })
        .then(res => {
          if (isCurrent) setExistingEntriesMap(res);
        })
        .catch(() => {
          if (isCurrent) setExistingEntriesMap({});
        });
    } else {
      setExistingEntriesMap({});
    }
    return () => { isCurrent = false; };
  }, [productionDate, shift]);

  // When worker is selected, populate machine rows (filtered by assignment)
  useEffect(() => {
    if (workerId) {
      const assignedIds = workerAssignments[workerId];
      // If the worker has assignments, show only those machines; otherwise show all
      const filtered =
        assignedIds && assignedIds.length > 0
          ? machines.filter(m => assignedIds.includes(m.id))
          : machines;
      setMachineRows(
        filtered.map(m => ({
          machine: m,
          meters: '',
          status: 'idle',
        }))
      );
      setSubmitDone(false);
      setGlobalMessage(null);
      // Focus first input after render
      setTimeout(() => firstInputRef.current?.focus(), 100);
    } else {
      setMachineRows([]);
      setSubmitDone(false);
    }
  }, [workerId, machines, workerAssignments]);

  const handleMetersChange = (machineId: string, value: string) => {
    setMachineRows(prev =>
      prev.map(row =>
        row.machine.id === machineId ? { ...row, meters: value, status: 'idle', errorMsg: undefined } : row
      )
    );
    setSubmitDone(false);
    setGlobalMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next input
      const inputs = document.querySelectorAll<HTMLInputElement>('.bulk-meter-input');
      if (inputs[idx + 1]) inputs[idx + 1].focus();
    }
  };

  const filledCount = machineRows.filter(r => r.meters.trim() !== '' && parseFloat(r.meters) > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      setGlobalMessage({ type: 'error', text: 'Please select a worker first.' });
      return;
    }

    const toSubmit = machineRows.filter(r => r.meters.trim() !== '' && parseFloat(r.meters) > 0);
    if (toSubmit.length === 0) {
      setGlobalMessage({ type: 'error', text: 'Please enter meters for at least one machine.' });
      return;
    }

    setIsSubmitting(true);
    setGlobalMessage(null);

    // Mark all filled rows as submitting
    setMachineRows(prev =>
      prev.map(row =>
        row.meters.trim() !== '' && parseFloat(row.meters) > 0
          ? { ...row, status: 'idle' }
          : { ...row, status: 'skipped' }
      )
    );

    let successCount = 0;
    let errorCount = 0;

    // Submit all entries concurrently
    const results = await Promise.all(
      toSubmit.map(async (row) => {
        const parsedMeters = parseFloat(row.meters);
        const result = await createProductionEntry({
          workerId,
          machineId: row.machine.id,
          productionDate,
          shift,
          metersProduced: parsedMeters,
        });
        return { machineId: row.machine.id, result, parsedMeters };
      })
    );

    // Update row statuses
    const updatedMap = new Map<string, { status: 'success' | 'error'; errorMsg?: string }>();
    for (const r of results) {
      if (r.result.error) {
        errorCount++;
        updatedMap.set(r.machineId, { status: 'error', errorMsg: r.result.error });
      } else {
        successCount++;
        updatedMap.set(r.machineId, {
          status: 'success',
        });
      }
    }

    setMachineRows(prev =>
      prev.map(row => {
        const update = updatedMap.get(row.machine.id);
        if (update) {
          return {
            ...row,
            status: update.status,
            errorMsg: update.errorMsg,
            meters: update.status === 'success' ? '' : row.meters,
          };
        }
        return { ...row, status: 'skipped', meters: '' };
      })
    );

    setIsSubmitting(false);
    setSubmitDone(true);

    if (errorCount === 0) {
      setGlobalMessage({
        type: 'success',
        text: `✓ Successfully saved ${successCount} entries (${shift === 'day' ? 'Day' : 'Night'} Shift)!`,
      });
      // Refresh existing entries map
      getExistingEntriesForDateAndShift({ productionDate, shift }).then(res => setExistingEntriesMap(res));
      // Reset after short delay
      setTimeout(() => {
        setMachineRows(prev => prev.map(r => ({ ...r, meters: '', status: 'idle', errorMsg: undefined })));
        setSubmitDone(false);
        setGlobalMessage(null);
      }, 3000);
    } else {
      setGlobalMessage({
        type: 'error',
        text: `⚠️ ${successCount} saved, ${errorCount} failed. Check errors below.`,
      });
    }
  };

  const selectedWorker = workers.find(w => w.id === workerId);

  return (
    <div className={styles.container}>
      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.filterGrid}>
          {/* Worker Select */}
          <div className={styles.fieldGroup} style={{ flex: '1 1 240px' }}>
            <label className={styles.label}>Worker</label>
            <select
              value={workerId}
              onChange={e => setWorkerId(e.target.value)}
              disabled={isSubmitting}
              className={styles.select}
              style={{ fontWeight: workerId ? 600 : 400 }}
            >
              <option value="">— Select Worker —</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className={styles.fieldGroup} style={{ flex: '1 1 180px' }}>
            <label className={styles.label}>Production Date</label>
            <input
              type="date"
              value={productionDate}
              max={today}
              onChange={e => setProductionDate(e.target.value)}
              disabled={isSubmitting}
              className={styles.input}
            />
          </div>

          {/* Shift */}
          <div className={styles.fieldGroup} style={{ flex: '1 1 200px' }}>
            <label className={styles.label}>Shift</label>
            <div className={styles.shiftToggle}>
              <button
                type="button"
                onClick={() => setShift('day')}
                disabled={isSubmitting}
                className={`${styles.shiftBtn} ${shift === 'day' ? styles.shiftBtnDayActive : ''}`}
              >
                ☀️ Day
              </button>
              <button
                type="button"
                onClick={() => setShift('night')}
                disabled={isSubmitting}
                className={`${styles.shiftBtn} ${shift === 'night' ? styles.shiftBtnNightActive : ''}`}
              >
                🌙 Night
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Message */}
      {globalMessage && (
        <div className={`${styles.alertMessage} ${globalMessage.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          <span>{globalMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* No assignments warning */}
      {workerId && (workerAssignments[workerId] ?? []).length === 0 && (
        <div className={styles.assignmentWarning}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>
            <strong>{workers.find(w => w.id === workerId)?.name}</strong> has no machine assignments yet.
            Showing all {machines.length} machines. Go to <strong>Workers → 🔧 Machines</strong> to assign specific machines.
          </span>
        </div>
      )}

      {/* Machine Rows — shown once worker is selected */}
      {workerId && machineRows.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className={styles.tableContainer}>
            {/* Table header */}
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderCol}>Machine</div>
              <div className={styles.tableHeaderCol} style={{ textAlign: 'right' }}>Meters Produced</div>
            </div>

            {/* Machine rows */}
            {machineRows.map((row, idx) => {
              const rowBg =
                row.status === 'success' ? '#f0fdf4' :
                row.status === 'error' ? '#fef2f2' :
                row.status === 'skipped' ? '#f8fafc' :
                row.meters && parseFloat(row.meters) > 0 ? '#ffffff' : '#fafafa';

              const borderLeft =
                row.status === 'success' ? '3px solid #22c55e' :
                row.status === 'error' ? '3px solid #ef4444' :
                row.meters && parseFloat(row.meters) > 0 ? '3px solid #0ea5e9' :
                '3px solid transparent';

              return (
                <div key={row.machine.id}>
                  <div
                    className={styles.machineRow}
                    style={{ background: rowBg, borderLeft }}
                  >
                    {/* Machine info & status */}
                    <div>
                      <div className={styles.machineTitle}>
                        Machine {row.machine.machineNumber}
                      </div>
                      {row.status === 'idle' && existingEntriesMap[row.machine.id] && (
                        <div className={styles.loggedBadge}>
                          ⚠️ Logged: {existingEntriesMap[row.machine.id].metersProduced.toFixed(2)} m ({existingEntriesMap[row.machine.id].workerName})
                        </div>
                      )}
                      {row.status === 'success' && (
                        <div className={styles.statusSuccess}>✓ Saved successfully</div>
                      )}
                      {row.status === 'error' && (
                        <div className={styles.statusError}>✗ {row.errorMsg}</div>
                      )}
                      {row.status === 'skipped' && (
                        <div className={styles.statusSkipped}>— Skipped</div>
                      )}
                    </div>

                    {/* Meters input */}
                    <div>
                      <input
                        ref={idx === 0 ? firstInputRef : undefined}
                        className={`bulk-meter-input ${styles.meterInput} ${row.meters && parseFloat(row.meters) > 0 ? styles.meterInputActive : ''}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={row.meters}
                        onChange={e => handleMetersChange(row.machine.id, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx)}
                        disabled={isSubmitting || row.status === 'success'}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {idx < machineRows.length - 1 && (
                    <div style={{ height: '1px', background: '#f1f5f9', marginLeft: '24px' }} />
                  )}
                </div>
              );
            })}

            {/* Totals row */}
            {filledCount > 0 && (
              <div className={styles.totalsRow}>
                <div className={styles.totalsLabel}>
                  TOTAL ({filledCount} machine{filledCount !== 1 ? 's' : ''})
                </div>
                <div className={styles.totalsValue}>
                  {machineRows
                    .filter(r => r.meters && parseFloat(r.meters) > 0)
                    .reduce((sum, r) => sum + parseFloat(r.meters), 0)
                    .toFixed(2)} m
                </div>
              </div>
            )}
          </div>

          {/* Instruction text */}
          <p className={styles.hintText}>
            💡 Leave a machine blank to skip it. Press <kbd className={styles.kbd}>Enter</kbd> to jump to the next machine.
          </p>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || filledCount === 0}
            className={`${styles.submitBtn} ${filledCount > 0 ? styles.submitBtnActive : styles.submitBtnDisabled}`}
          >
            {isSubmitting
              ? `⏳ Saving ${filledCount} entr${filledCount === 1 ? 'y' : 'ies'}...`
              : filledCount > 0
              ? `💾 Save ${filledCount} Entr${filledCount === 1 ? 'y' : 'ies'} for ${selectedWorker?.name}`
              : 'Enter meters above to save'}
          </button>
        </form>
      )}

      {/* Empty state */}
      {!workerId && (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>🧵</div>
          <div className={styles.emptyStateTitle}>
            Select a Worker to Begin
          </div>
          <div className={styles.emptyStateDesc}>
            All assigned looms and machines will appear automatically so you can log meters rapidly in one smooth workflow.
          </div>
        </div>
      )}
    </div>
  );
}
