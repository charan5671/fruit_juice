'use client';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function UserManagement() {
    const { employees } = useStore();
    const [filter, setFilter] = useState<'pending' | 'active' | 'all'>('pending');

    const filtered = filter === 'all' ? employees : employees.filter(e => e.status === filter);
    const pendingCount = employees.filter(e => e.status === 'pending').length;

    const approveUser = async (id: number) => {
        await supabase.from('employees').update({ status: 'active' }).eq('id', id);
        await supabase.from('notifications').insert({
            type: 'success', title: 'Account Approved', message: `Employee #${id} has been activated`, module: 'admin',
        });
        useStore.getState().refreshData();
    };

    const terminateUser = async (id: number) => {
        await supabase.from('employees').update({ status: 'terminated' }).eq('id', id);
        useStore.getState().refreshData();
    };

    const changeRole = async (id: number, role: string) => {
        await supabase.from('employees').update({ role }).eq('id', id);
        await supabase.from('audit_log').insert({
            action: 'ROLE_CHANGED', user_id: useStore.getState().currentEmployeeId, user_name: useStore.getState().currentName, module: 'admin', details: `Employee #${id} → ${role}`,
        });
        useStore.getState().refreshData();
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h1 className="section-title">User Management</h1>
                    <p className="section-subtitle">Approve registrations, manage roles, control access</p>
                </div>
                {pendingCount > 0 && (
                    <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 16px' }}>⚠ {pendingCount} pending approval</span>
                )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['pending', 'active', 'all'] as const).map(f => (
                    <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}</button>
                ))}
            </div>

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Outlet</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No {filter} users found</td></tr>
                        )}
                        {filtered.map(emp => (
                            <tr key={emp.id}>
                                <td style={{ fontWeight: 700 }}>{emp.name}</td>
                                <td style={{ fontSize: 12 }}>{emp.email}</td>
                                <td>
                                    <select className="input" value={emp.role} onChange={e => changeRole(emp.id, e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                                        <option value="seller">Seller</option>
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td>#{emp.outlet_id || '—'}</td>
                                <td><span className={`badge ${emp.status === 'active' ? 'badge-success' : emp.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{emp.status}</span></td>
                                <td style={{ fontSize: 12 }}>{emp.join_date || '—'}</td>
                                <td style={{ display: 'flex', gap: 4 }}>
                                    {emp.status === 'pending' && (
                                        <>
                                            <button className="btn btn-sm btn-primary" onClick={() => approveUser(emp.id)}>✓ Approve</button>
                                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => terminateUser(emp.id)}>✕ Reject</button>
                                        </>
                                    )}
                                    {emp.status === 'active' && (
                                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => terminateUser(emp.id)}>Deactivate</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
