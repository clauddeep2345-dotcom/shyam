'use client';

import React, { useState } from 'react';
import styles from './payroll.module.css';
import tableStyles from '@/components/table.module.css';
import Modal from '@/components/Modal';
import { finalizePayroll, reopenPayroll, markPayrollPaid, getPayrollPeriods } from '@/actions/payroll';
import { format } from 'date-fns';

interface Props {
  initialPeriods: any[];
  userId: string;
}

export default function PayrollClient({ initialPeriods, userId }: Props) {
  const [periods, setPeriods] = useState<any[]>(initialPeriods);
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  
  // Pay Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'upi'>('cash');
  const [payNote, setPayNote] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleFinalize = async (periodId: string) => {
    if (confirm('Finalize this payroll? Production edits will no longer affect this period.')) {
      setLoading(true);
      const result = await finalizePayroll(periodId);
      if (result.error) { alert(result.error); setLoading(false); return; }
      window.location.reload();
    }
  };

  const handleReopen = async (periodId: string) => {
    if (confirm('Reopen this payroll? Status returns to open. Payment logs are NOT deleted.')) {
      setLoading(true);
      const result = await reopenPayroll(periodId);
      if (result.error) { alert(result.error); setLoading(false); return; }
      window.location.reload();
    }
  };

  const openPayModal = (record: any) => {
    setSelectedRecord(record);
    setPayMethod('cash');
    setPayNote('');
    setIsPayOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !selectedPeriod) return;
    setLoading(true);
    
    const result = await markPayrollPaid(selectedPeriod.id, [{
      payrollRecordId: selectedRecord.id,
      workerId: selectedRecord.worker_id,
      amountPaid: Number(selectedRecord.net_amount),
      paymentMethod: payMethod,
      notes: payNote || undefined,
    }]);
    
    if (result.error) { alert(result.error); setLoading(false); return; }
    window.location.reload();
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      paid: { background: '#dcfce7', color: '#166534' },
      finalized: { background: '#fef9c3', color: '#854d0e' },
      open: { background: '#f1f5f9', color: '#475569' },
      reopened: { background: '#fef9c3', color: '#854d0e' },
      pending: { background: '#fef9c3', color: '#854d0e' },
    };
    return styles[status] || styles.open;
  };

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>Payroll Management</h1>
      </div>

      <div className={styles.container}>
        <div className={styles.periodList}>
          <h3>Payroll Periods</h3>
          {periods.map(period => (
            <div 
              key={period.id} 
              className={`${styles.periodCard} ${selectedPeriod?.id === period.id ? styles.activeCard : ''}`}
              onClick={() => setSelectedPeriod(period)}
            >
              <div className={styles.periodDates}>
                {format(new Date(period.period_start), 'MMM dd')} - {format(new Date(period.period_end), 'MMM dd, yyyy')}
              </div>
              <div className={styles.periodMeta}>
                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...getStatusStyle(period.status) }}>
                  {period.status.toUpperCase()}
                </span>
                <span>Due {format(new Date(period.payment_due_date), 'MMM dd')}</span>
              </div>
            </div>
          ))}
          {periods.length === 0 && <p className={styles.noData}>No payroll periods found.</p>}
        </div>

        <div className={styles.periodDetails}>
          {selectedPeriod ? (
            <>
              <div className={styles.detailsHeader}>
                <div>
                  <h2>Period Details</h2>
                  <p>{format(new Date(selectedPeriod.period_start), 'MMM dd, yyyy')} to {format(new Date(selectedPeriod.period_end), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  {(selectedPeriod.status === 'open' || selectedPeriod.status === 'reopened') && (
                    <button className={tableStyles.primaryButton} onClick={() => handleFinalize(selectedPeriod.id)} disabled={loading}>
                      🔒 Finalize Payroll
                    </button>
                  )}
                  {(selectedPeriod.status === 'finalized' || selectedPeriod.status === 'paid') && (
                    <button className={tableStyles.actionButton} onClick={() => handleReopen(selectedPeriod.id)} disabled={loading}>
                      🔓 Reopen
                    </button>
                  )}
                </div>
              </div>

              <div className={tableStyles.tableContainer}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Worker Name</th>
                      <th>Total Meters</th>
                      <th>Total Amount</th>
                      <th>Advance Deduction</th>
                      <th>Net Amount (₹)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPeriod.payroll_records || []).map((record: any) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 600 }}>{record.workers?.name}</td>
                        <td>{Number(record.total_meters).toFixed(2)}</td>
                        <td>₹{Number(record.total_amount).toFixed(2)}</td>
                        <td style={{ color: '#ef4444' }}>-₹{Number(record.advance_deduction).toFixed(2)}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>₹{Number(record.net_amount).toFixed(2)}</td>
                        <td>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...getStatusStyle(record.payment_status) }}>
                            {record.payment_status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {selectedPeriod.status === 'finalized' && record.payment_status !== 'paid' && (
                            <button className={tableStyles.primaryButton} onClick={() => openPayModal(record)} style={{ padding: '6px 12px' }}>
                              Mark Paid
                            </button>
                          )}
                          {record.payment_status === 'paid' && (
                            <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>✓ PAID</span>
                          )}
                          {selectedPeriod.status === 'open' && (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>Awaiting Finalization</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(selectedPeriod.payroll_records || []).length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No worker records for this period. Finalize to calculate.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a payroll period from the left to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Mark Salary Paid">
        {selectedRecord && (
          <form onSubmit={handlePay}>
            <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>Worker: <strong>{selectedRecord.workers?.name}</strong></p>
              <p style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 'bold' }}>Amount: ₹{Number(selectedRecord.net_amount).toFixed(2)}</p>
            </div>

            <div className={tableStyles.formGroup}>
              <label>Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value as 'cash' | 'bank_transfer' | 'upi')}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div className={tableStyles.formGroup}>
              <label>Reference Note / Transaction ID (Optional)</label>
              <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} />
            </div>

            <div className={tableStyles.formActions}>
              <button type="button" className={tableStyles.cancelButton} onClick={() => setIsPayOpen(false)}>Cancel</button>
              <button type="submit" className={tableStyles.primaryButton} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
