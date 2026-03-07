'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/lib/store';
import { useState } from 'react';

export default function Profile() {
    const { employeeProfile, biometricRegister, biometricAvailable, updatePassword } = useAuth();
    const { currentName, currentRole, updateEmployee, currentEmployeeId } = useStore();
    const [bioStatus, setBioStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [passStep, setPassStep] = useState<'idle' | 'changing' | 'success' | 'error'>('idle');
    const [newPass, setNewPass] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Profile Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', phone: '' });

    const handleEditStart = () => {
        // @ts-ignore
        setEditData({ name: employeeProfile?.name || '', phone: employeeProfile?.phone || '' });
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        if (currentEmployeeId) {
            await updateEmployee(currentEmployeeId, editData);
        }
        setIsEditing(false);
    };

    const handleRegisterBio = async () => {
        const success = await biometricRegister();
        setBioStatus(success ? 'success' : 'error');
        setTimeout(() => setBioStatus('idle'), 3000);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (newPass.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }

        const error = await updatePassword(newPass);
        if (error) {
            setPassStep('error');
            setErrorMsg(error.message);
        } else {
            setPassStep('success');
            setNewPass('');
            setTimeout(() => setPassStep('idle'), 3000);
        }
    };

    return (
        <div className="animate-in">
            <h1 className="section-title">My Profile</h1>
            <p className="section-subtitle">Account security and personal settings</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 20 }}>
                <div className="card glass" style={{ textAlign: 'center', padding: '40px 24px', position: 'relative' }}>
                    {!isEditing && (
                        <button className="btn btn-sm btn-outline" style={{ position: 'absolute', top: 16, right: 16 }} onClick={handleEditStart}>✎ Edit</button>
                    )}

                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32, fontWeight: 900 }}>
                        {employeeProfile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </div>

                    {isEditing ? (
                        <div style={{ marginBottom: 16 }}>
                            <input className="input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, padding: 8, marginBottom: 8 }} placeholder="Full Name" />
                        </div>
                    ) : (
                        <h2 style={{ fontSize: 20, marginBottom: 4 }}>{employeeProfile?.name}</h2>
                    )}

                    <div className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: 13 }}>{currentRole}</div>

                    <div style={{ marginTop: 24, textAlign: 'left', borderTop: '1px solid var(--glass-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{employeeProfile?.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phone</span>
                            {isEditing ? (
                                <input className="input" style={{ width: 140, padding: '4px 8px', fontSize: 12 }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="+91 XXXXX" />
                            ) : (
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{(employeeProfile as any)?.phone || '—'}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status</span>
                            <span className="badge badge-success">Active</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Outlet ID</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>#{employeeProfile?.outlet_id || 1}</span>
                        </div>
                    </div>

                    {isEditing && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile}>Save Changes</button>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    )}
                </div>

                <div className="card glass">
                    <h4 style={{ marginBottom: 16 }}>Security & Biometrics</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Enable faster login using your device&apos;s fingerprint sensor or face recognition.
                    </p>

                    {biometricAvailable ? (
                        <div>
                            <button
                                className={`btn ${bioStatus === 'success' ? 'badge-success' : 'btn-primary'}`}
                                onClick={handleRegisterBio}
                                style={{ width: '100%', marginBottom: 12 }}
                            >
                                {bioStatus === 'success' ? '✓ Registered' : bioStatus === 'error' ? '✕ Registration Failed' : '🔐 Link Biometrics'}
                            </button>
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                This links your current device to your FreshJuice account using WebAuthn standards.
                            </p>
                        </div>
                    ) : (
                        <div style={{ padding: 12, background: 'rgba(211,47,47,0.1)', borderRadius: 8, color: 'var(--danger)', fontSize: 12 }}>
                            Biometric authentication is not supported on this browser or device.
                        </div>
                    )}

                    <div style={{ marginTop: 24, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>Account Password</h4>

                        {passStep === 'idle' && (
                            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setPassStep('changing')}>
                                Change Password
                            </button>
                        )}

                        {passStep === 'changing' && (
                            <form onSubmit={handleChangePassword}>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="Enter new password (min 6 chars)"
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    autoFocus
                                    style={{ marginBottom: 8 }}
                                />
                                {errorMsg && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{errorMsg}</div>}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Setup</button>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setPassStep('idle'); setErrorMsg(''); }}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {passStep === 'success' && (
                            <div className="badge badge-success" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                                ✓ Password updated successfully
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
