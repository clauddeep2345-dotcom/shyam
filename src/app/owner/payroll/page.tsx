import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import tableStyles from '@/components/table.module.css';

export default async function OwnerPayrollPage() {
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from('payroll_periods')
    .select(`
      *,
      payroll_records(
        *,
        workers!inner(name)
      )
    `)
    .order('period_start', { ascending: false });

  return (
    <div>
      <div className={tableStyles.pageHeader}>
        <h1 className={tableStyles.pageTitle}>Payroll History</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {(periods || []).map(period => {
          const totalMeters = period.payroll_records?.reduce((s: number, r: any) => s + Number(r.total_meters), 0) || 0;
          const totalAmount = period.payroll_records?.reduce((s: number, r: any) => s + Number(r.total_amount), 0) || 0;
          const totalNet = period.payroll_records?.reduce((s: number, r: any) => s + Number(r.net_amount), 0) || 0;

          return (
            <div key={period.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
                    {format(new Date(period.period_start), 'MMM dd, yyyy')} - {format(new Date(period.period_end), 'MMM dd, yyyy')}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '14px' }}>
                    <span>Status: <strong>{period.status.toUpperCase()}</strong></span>
                    <span>Due: {format(new Date(period.payment_due_date), 'MMM dd')}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Total Payroll</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>₹{totalNet.toFixed(2)}</div>
                </div>
              </div>

              <div className={tableStyles.tableContainer} style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Total Meters</th>
                      <th>Gross Amount</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(period.payroll_records || []).map((record: any) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 500 }}>{record.workers?.name}</td>
                        <td>{Number(record.total_meters).toFixed(2)}</td>
                        <td>₹{Number(record.total_amount).toFixed(2)}</td>
                        <td style={{ color: '#ef4444' }}>-₹{Number(record.advance_deduction).toFixed(2)}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>₹{Number(record.net_amount).toFixed(2)}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: record.payment_status === 'paid' ? '#dcfce7' : '#fef9c3',
                            color: record.payment_status === 'paid' ? '#166534' : '#854d0e'
                          }}>
                            {record.payment_status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(period.payroll_records || []).length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {(!periods || periods.length === 0) && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>
            No payroll history available.
          </div>
        )}
      </div>
    </div>
  );
}
