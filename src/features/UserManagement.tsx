'use client';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function UserManagement() {
    const { employees, addEmployee, updateEmployee, deleteEmployee, outlets, refreshData } = useStore();
    const [filter, setFilter] = useState<'pending' | 'active' | 'all'>('pending');
    const [view, setView] = useState<'list' | 'add'>('list');

    // Add state
    const [newEmp, setNewEmp] = useState({ name: '', email: '', role: 'staff', outlet_id: 1, phone: '', salary: 15000 });

    // Edit state
    const [editEmpId, setEditEmpId] = useState<number | null>(null);
    const [editData, setEditData] = useState({ name: '', email: '', role: 'staff', outlet_id: 1, salary: 15000 });

    const filtered = filter === 'all' ? employees : employees.filter(e => e.status === filter);
    const pendingCount = employees.filter(e => e.status === 'pending').length;

    const handleAdd = async () => {
        if (!newEmp.name || !newEmp.email) return alert('Name and Email required');
        await addEmployee({ ...newEmp, auth_uid: `temp-${Date.now()}` }); // Mock auth uid until they register
        setNewEmp({ name: '', email: '', role: 'staff', outlet_id: 1, phone: '', salary: 15000 });
        setView('list');
        alert('Employee invited successfully!');
    };

    const approveUser = async (id: number) => {
        try {
            await supabase.from('employees').update({ status: 'active' }).eq('id', id);
            await supabase.from('notifications').insert({
                type: 'success', title: 'Account Approved', message: `Employee #${id} has been activated`, module: 'admin',
            });
            await refreshData(['Settings']);
        } catch (err: any) {
            alert(`Failed to approve user: ${err.message}`);
        }
    };

    const terminateUser = async (id: number) => {
        try {
            await supabase.from('employees').update({ status: 'terminated' }).eq('id', id);
            await refreshData(['Settings']);
        } catch (err: any) {
            alert(`Failed to terminate user: ${err.message}`);
        }
    };

    const changeRole = async (id: number, role: string) => {
        try {
            await supabase.from('employees').update({ role }).eq('id', id);
            await supabase.from('audit_log').insert({
                action: 'ROLE_CHANGED', user_id: useStore.getState().currentEmployeeId, user_name: useStore.getState().currentName, module: 'admin', details: `Employee #${id} → ${role}`,
            });
            await refreshData(['Settings']);
        } catch (err: any) {
            alert(`Failed to change role: ${err.message}`);
        }
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h1 className="section-title">User Management</h1>
                    <p className="section-subtitle">Approve registrations, manage roles, control access</p>
                </div>
                {pendingCount > 0 && view === 'list' && (
                    <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 16px' }}>⚠ {pendingCount} pending approval</span>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>👥 Directory</button>
                    <button className={`btn btn-sm ${view === 'add' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('add')}>+ Add Employee</button>
                </div>
            </div>

            {view === 'add' ? (
                <div className="card glass" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Onboard New Employee</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Full Name</label>
                            <input className="input" placeholder="e.g. John Doe" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Email Address</label>
                            <input className="input" type="email" placeholder="john@example.com" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Role</label>
                            <select className="input" value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}>
                                <option value="seller">Seller</option>
                                <option value="staff">Staff</option>
                                <option value="manager">Inventory Manager</option>
                                <option value="procurement">Procurement</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Assigned Outlet</label>
                            <select className="input" value={newEmp.outlet_id} onChange={e => setNewEmp({ ...newEmp, outlet_id: Number(e.target.value) })}>
                                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Monthly Salary (₹)</label>
                            <input className="input" type="number" value={newEmp.salary} onChange={e => setNewEmp({ ...newEmp, salary: Number(e.target.value) })} />
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={handleAdd}>Send Invitation</button>
                </div>
            ) : (
                <>
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
                                {filtered.map(emp => {
                                    const isEditing = editEmpId === emp.id;
                                    return (
                                        <tr key={emp.id}>
                                            {isEditing ? (
                                                <>
                                                    <td><input className="input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ padding: '4px', fontSize: 12 }} /></td>
                                                    <td><input className="input" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} style={{ padding: '4px', fontSize: 12 }} /></td>
                                                    <td>
                                                        <select className="input" value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                                                            <option value="seller">Seller</option>
                                                            <option value="staff">Staff</option>
                                                            <option value="manager">Inventory Manager</option>
                                                            <option value="procurement">Procurement</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select className="input" value={editData.outlet_id} onChange={e => setEditData({ ...editData, outlet_id: Number(e.target.value) })} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                                                            {outlets.map(o => <option key={o.id} value={o.id}>#{o.id} {o.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td><span className={`badge ${emp.status === 'active' ? 'badge-success' : emp.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{emp.status}</span></td>
                                                    <td style={{ fontSize: 12 }}>{emp.join_date || '—'}</td>
                                                    <td style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-sm btn-primary" onClick={async () => {
                                                            await updateEmployee(emp.id, editData);
                                                            setEditEmpId(null);
                                                        }}>Save</button>
                                                        <button className="btn btn-sm btn-outline" onClick={() => setEditEmpId(null)}>Cancel</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ fontWeight: 700 }}>{emp.name}</td>
                                                    <td style={{ fontSize: 12 }}>{emp.email}</td>
                                                    <td style={{ textTransform: 'capitalize' }}>{emp.role}</td>
                                                    <td>#{emp.outlet_id || '—'}</td>
                                                    <td><span className={`badge ${emp.status === 'active' ? 'badge-success' : emp.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{emp.status}</span></td>
                                                    <td style={{ fontSize: 12 }}>{emp.join_date || '—'}</td>
                                                    <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {emp.status === 'pending' && (
                                                            <>
                                                                <button className="btn btn-sm btn-primary" onClick={() => approveUser(emp.id)}>✓ Apprv</button>
                                                                <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => terminateUser(emp.id)}>✕ Rjct</button>
                                                            </>
                                                        )}
                                                        {emp.status === 'active' && (
                                                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => terminateUser(emp.id)}>Term</button>
                                                        )}
                                                        <button className="btn btn-sm btn-outline" onClick={() => { setEditEmpId(emp.id); setEditData({ name: emp.name, email: emp.email, role: emp.role, outlet_id: emp.outlet_id, salary: emp.salary || 15000 }); }}>Edit</button>
                                                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={async () => { if (confirm(`Permanently delete ${emp.name}?`)) await deleteEmployee(emp.id); }}>Del</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
