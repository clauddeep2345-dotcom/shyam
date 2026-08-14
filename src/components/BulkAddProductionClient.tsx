'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createProductionEntry } from '@/actions/production';
import { format } from 'date-fns';

interface WorkerData { id: string; name: string; }
interface MachineData { id: string; machineNumber: string; currentRatePerMeter: number; }

interface Props {
  workers: WorkerData[];
  machines: MachineData[];
  userId: string;
  // workerId -> array of assigned machineIds
  workerAssignments: Record<string, string[]>;
}

interface MachineRow {
  machine: MachineData;
  meters: string;
  status: 'idle' | 'success' | 'error' | 'skipped';
  errorMsg?: string;
  savedAmount?: number;
}

export default function BulkAddProductionClient({ workers, machines, userId, workerAssignments }: Props) {
  const [productionDate, setProductionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [workerId, setWorkerId] = useState<string>('');
  const [machineRows, setMachineRows] = useState<MachineRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstInputRef = useRef<HTMLInputElement>(null);

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
          metersProduced: parsedMeters,
        });
        return { machineId: row.machine.id, result, parsedMeters, rate: row.machine.currentRatePerMeter };
      })
    );

    // Update row statuses
    const updatedMap = new Map<string, { status: 'success' | 'error'; errorMsg?: string; savedAmount?: number }>();
    for (const r of results) {
      if (r.result.error) {
        errorCount++;
        updatedMap.set(r.machineId, { status: 'error', errorMsg: r.result.error });
      } else {
        successCount++;
        updatedMap.set(r.machineId, {
          status: 'success',
          savedAmount: Math.round(r.parsedMeters * r.rate * 100) / 100,
        });
      }
    }

    setMachineRows(prev =>
      prev.map(row => {
        const update = updatedMap.get(row.machine.id);
        if (update) return { ...row, ...update };
        return { ...row, status: 'skipped', meters: '' };
      })
    );

    setIsSubmitting(false);
    setSubmitDone(true);

    if (errorCount === 0) {
      setGlobalMessage({
        type: 'success',
        text: `✅ ${successCount} entr${successCount === 1 ? 'y' : 'ies'} saved successfully!`,
      });
      // Reset after short delay
      setTimeout(() => {
        setMachineRows(prev => prev.map(r => ({ ...r, meters: '', status: 'idle', errorMsg: undefined, savedAmount: undefined })));
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
    <div style={{ maxWidth: '800px', width: '100%' }}>
      {/* Header Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px 32px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Worker Select */}
          <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Worker
            </label>
            <select
              value={workerId}
              onChange={e => setWorkerId(e.target.value)}
              disabled={isSubmitting}
              style={{
                padding: '14px 16px',
                fontSize: '15px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                background: '#f8fafc',
                color: workerId ? '#0f172a' : '#94a3b8',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: workerId ? 600 : 400,
              }}
            >
              <option value="">— Select Worker —</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Production Date
            </label>
            <input
              type="date"
              value={productionDate}
              max={today}
              onChange={e => setProductionDate(e.target.value)}
              disabled={isSubmitting}
              style={{
                padding: '14px 16px',
                fontSize: '15px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                background: '#f8fafc',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Global Message */}
      {globalMessage && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '16px',
          fontWeight: 600,
          fontSize: '15px',
          background: globalMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: globalMessage.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${globalMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {globalMessage.text}
        </div>
      )}

      {/* No assignments warning */}
      {workerId && (workerAssignments[workerId] ?? []).length === 0 && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: '14px',
          background: '#fffbeb',
          color: '#92400e',
          border: '1px solid #fde68a',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
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
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '20px',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 120px 120px',
              padding: '12px 20px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              gap: '12px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Machine</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate (₹/m)</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meters</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
            </div>

            {/* Machine rows */}
            {machineRows.map((row, idx) => {
              const parsedMeters = parseFloat(row.meters);
              const previewAmount = !isNaN(parsedMeters) && parsedMeters > 0
                ? Math.round(parsedMeters * row.machine.currentRatePerMeter * 100) / 100
                : null;

              const rowBg =
                row.status === 'success' ? '#f0fdf4' :
                row.status === 'error' ? '#fef2f2' :
                row.status === 'skipped' ? '#f8fafc' :
                row.meters && parseFloat(row.meters) > 0 ? '#fff' : '#fafafa';

              const borderLeft =
                row.status === 'success' ? '3px solid #22c55e' :
                row.status === 'error' ? '3px solid #ef4444' :
                row.meters && parseFloat(row.meters) > 0 ? '3px solid #38bdf8' :
                '3px solid transparent';

              return (
                <div key={row.machine.id}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 120px 120px',
                    padding: '14px 20px',
                    gap: '12px',
                    alignItems: 'center',
                    background: rowBg,
                    borderLeft,
                    transition: 'all 0.2s',
                  }}>
                    {/* Machine name */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                        Machine {row.machine.machineNumber}
                      </div>
                      {row.status === 'success' && (
                        <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>✓ Saved</div>
                      )}
                      {row.status === 'error' && (
                        <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>✗ {row.errorMsg}</div>
                      )}
                      {row.status === 'skipped' && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>— Skipped</div>
                      )}
                    </div>

                    {/* Rate */}
                    <div style={{
                      fontSize: '14px',
                      color: row.machine.currentRatePerMeter > 0 ? '#334155' : '#ef4444',
                      fontWeight: 500,
                    }}>
                      {row.machine.currentRatePerMeter > 0
                        ? `₹${row.machine.currentRatePerMeter.toFixed(3)}`
                        : 'No rate!'}
                    </div>

                    {/* Meters input */}
                    <div>
                      <input
                        ref={idx === 0 ? firstInputRef : undefined}
                        className="bulk-meter-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={row.meters}
                        onChange={e => handleMetersChange(row.machine.id, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx)}
                        disabled={isSubmitting || row.status === 'success'}
                        placeholder="—"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '15px',
                          fontWeight: 600,
                          border: `1.5px solid ${row.meters && parseFloat(row.meters) > 0 ? '#38bdf8' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          background: row.status === 'success' ? '#f0fdf4' : 'white',
                          color: '#0f172a',
                          outline: 'none',
                          textAlign: 'right',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Amount preview */}
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: row.status === 'success'
                        ? '#16a34a'
                        : previewAmount !== null ? '#2563eb' : '#cbd5e1',
                      textAlign: 'right',
                    }}>
                      {row.status === 'success' && row.savedAmount !== undefined
                        ? `₹${row.savedAmount.toFixed(2)}`
                        : previewAmount !== null
                        ? `₹${previewAmount.toFixed(2)}`
                        : '—'}
                    </div>
                  </div>
                  {idx < machineRows.length - 1 && (
                    <div style={{ height: '1px', background: '#f1f5f9', marginLeft: '20px' }} />
                  )}
                </div>
              );
            })}

            {/* Totals row */}
            {filledCount > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 120px 120px',
                padding: '14px 20px',
                gap: '12px',
                background: '#1e293b',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>
                  TOTAL ({filledCount} machine{filledCount !== 1 ? 's' : ''})
                </div>
                <div />
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', textAlign: 'right' }}>
                  {machineRows
                    .filter(r => r.meters && parseFloat(r.meters) > 0)
                    .reduce((sum, r) => sum + parseFloat(r.meters), 0)
                    .toFixed(2)} m
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', textAlign: 'right' }}>
                  ₹{machineRows
                    .filter(r => r.meters && parseFloat(r.meters) > 0)
                    .reduce((sum, r) => sum + parseFloat(r.meters) * r.machine.currentRatePerMeter, 0)
                    .toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Instruction text */}
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
            💡 Leave a machine blank to skip it. Press <kbd style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}>Enter</kbd> to move to next machine.
          </p>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || filledCount === 0}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '17px',
              fontWeight: 700,
              background: filledCount === 0
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: filledCount === 0 ? '#94a3b8' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: filledCount === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: filledCount > 0 ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
            }}
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
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 32px',
          textAlign: 'center',
          border: '2px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Select a Worker to Begin
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '320px', margin: '0 auto' }}>
            After selecting a worker, all machines will appear below so you can enter meters for each in one go.
          </div>
        </div>
      )}
    </div>
  );
}
