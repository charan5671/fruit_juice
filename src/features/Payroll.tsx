'use client';
import { useStore } from '@/lib/store';
import { useState } from 'react';

export default function Payroll() {
    const { employees, payroll, runPayroll, currentRole, currentEmployeeId } = useStore();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    // R1: Non-admin/manager only see their own payroll records
    const isPrivileged = ['admin', 'manager'].includes(currentRole);
    const monthPayroll = payroll.filter(p => p.month === month && (isPrivileged || p.employee_id === currentEmployeeId));

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h1 className="section-title">Payroll Automation</h1>
                    <p className="section-subtitle">Auto-calculated from Supabase attendance data with overtime and deductions</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto' }} />
                    {isPrivileged && (
                        <button className="btn btn-primary" onClick={() => runPayroll(month)}>Generate Payroll</button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div className="card glass">
                    <div className="stat-label">Total Payroll</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>₹{monthPayroll.reduce((s, p) => s + Number(p.net_pay || 0), 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="card glass">
                    <div className="stat-label">Employees</div>
                    <div className="stat-value">{monthPayroll.length}</div>
                </div>
                <div className="card glass">
                    <div className="stat-label">Total Deductions</div>
                    <div className="stat-value" style={{ color: 'var(--danger)' }}>₹{monthPayroll.reduce((s, p) => s + Number(p.deductions || 0), 0).toLocaleString('en-IN')}</div>
                </div>
            </div>

            {monthPayroll.length === 0 ? (
                <div className="card glass" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No payroll generated for {month}. Click &quot;Generate Payroll&quot; to calculate.</p>
                </div>
            ) : (
                <div className="glass" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>Employee</th><th>Days Present</th><th>Hours</th><th>Base Pay</th><th>Overtime</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                        <tbody>
                            {monthPayroll.map(p => {
                                const emp = employees.find(e => e.id === p.employee_id);
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 700 }}>{emp?.name || '—'}</td>
                                        <td>{p.days_present}/{p.total_days}</td>
                                        <td>{p.hours_worked}h</td>
                                        <td>₹{Number(p.base_pay || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ color: 'var(--primary)' }}>+₹{Number(p.overtime || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ color: 'var(--danger)' }}>-₹{Number(p.deductions || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ fontWeight: 800, fontSize: 15 }}>₹{Number(p.net_pay || 0).toLocaleString('en-IN')}</td>
                                        <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'approved' ? 'badge-info' : 'badge-warning'}`}>{p.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
