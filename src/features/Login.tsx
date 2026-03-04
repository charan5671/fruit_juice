'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Login.module.css';

export default function Login() {
    const { signIn, signUp, forgotPassword, updatePassword, emergencyReset, biometricAvailable, biometricLogin } = useAuth();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'emergency'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryKey, setRecoveryKey] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('seller');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const isAdmin = email === 'charanmaddirala111@gmail.com';

    // Detect recovery link hash
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#reset') {
            setMode('reset');
            setSuccess('✅ Recovery link verified. Please set your new password.');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            const err = await signIn(email, password);
            if (err) {
                if (err.message.toLowerCase().includes('invalid login credentials')) {
                    if (isAdmin) {
                        setError('❌ Incorrect password. Since you are the Master Admin, you can use **Enterprise Setup** below if you forgot your credentials.');
                    } else {
                        setError('❌ Incorrect password. Please use the **Forgot Password** link below.');
                    }
                } else {
                    setError(err.message);
                }
            }
        } catch {
            setError('Account error. Please check your connection.');
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            const { error: regErr } = await signUp(email, password, name, role);
            if (regErr) {
                if (regErr.toLowerCase().includes('already registered')) {
                    setError('ℹ️ Account exists with this email. Would you like to **Upgrade to Password**?');
                    setSuccess('Click the "Forgot Password?" link below to set your new password.');
                } else {
                    setError(regErr);
                }
            } else {
                setSuccess('✅ Enterprise Account Activated! You can now Sign In.');
                setMode('login');
            }
        } catch {
            setError('Registration failed. Please check your connectivity.');
        }
        setLoading(false);
    };

    const [resetCooldown, setResetCooldown] = useState(0);
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resetCooldown > 0) interval = setInterval(() => setResetCooldown(c => c - 1), 1000);
        return () => clearInterval(interval);
    }, [resetCooldown]);

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (resetCooldown > 0) return;
        setError(''); setSuccess(''); setLoading(true);
        try {
            const err = await forgotPassword(email);
            if (err) setError(err.message);
            else {
                setSuccess('📧 Reset link sent! Please check your inbox.');
                setResetCooldown(60); // 1 minute cooldown
            }
        } catch {
            setError('Recovery failed. Please try again later.');
        }
        setLoading(false);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('❌ Passwords do not match.');
            return;
        }
        setError(''); setSuccess(''); setLoading(true);
        try {
            const err = await updatePassword(password);
            if (err) setError(err.message);
            else {
                setSuccess('✅ Password updated successfully! Please Sign In.');
                setMode('login');
                if (typeof window !== 'undefined') window.location.hash = '';
            }
        } catch {
            setError('Reset failed. Link may have expired.');
        }
        setLoading(false);
    };

    const handleEmergency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('❌ Passwords do not match.');
            return;
        }
        setError(''); setSuccess(''); setLoading(true);
        try {
            const resetErr = await emergencyReset(email, password, recoveryKey);
            if (resetErr) {
                setError(`❌ Recovery failed: ${resetErr}`);
            } else {
                setSuccess('✅ Enterprise Credentials Restored! You can now Sign In.');
                setMode('login');
            }
        } catch {
            setError('Emergency recovery failed. Please check your Master Key.');
        }
        setLoading(false);
    };

    const handleBiometric = async () => {
        setLoading(true); setError('');
        const savedEmail = await biometricLogin();
        if (savedEmail) {
            setEmail(savedEmail);
            setSuccess('Device verified! Please enter your password.');
            // Note: Password still required for first session or if biometric is just email key
            setLoading(false);
        } else {
            setError('Biometric not available on this device.');
        }
        setLoading(false);
    };

    return (
        <div className={styles.container}>
            <div className={styles.backdrop} />
            <div className={`${styles.card} glass`}>
                <div className={styles.header}>
                    <span className={styles.brandIcon}>🍹</span>
                    <h1 className={styles.title}>FreshJuice</h1>
                    <p className={styles.subtitle}>Enterprise Management Platform</p>
                </div>

                <div className={styles.statusSection}>
                    {error && <div className={styles.error}>⚠ {error}</div>}
                    {success && <div className={styles.success}>{success}</div>}
                </div>

                <form onSubmit={
                    mode === 'login' ? handleLogin :
                        mode === 'register' ? handleRegister :
                            mode === 'forgot' ? handleForgot :
                                mode === 'reset' ? handleReset : handleEmergency
                } className={styles.form}>
                    {mode !== 'forgot' && mode !== 'reset' && mode !== 'emergency' && (
                        <div className={styles.tabs}>
                            <button type="button" className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
                            <button type="button" className={`${styles.tab} ${mode === 'register' ? styles.activeTab : ''}`} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</button>
                        </div>
                    )}

                    {(mode === 'forgot' || mode === 'reset' || mode === 'emergency') && (
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, marginBottom: 8 }}>
                                {mode === 'forgot' ? 'Recover Account' :
                                    mode === 'reset' ? 'Set New Password' : 'Enterprise Setup'}
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {mode === 'forgot' ? 'Enter your email to receive a password reset link.' :
                                    mode === 'reset' ? 'Secure your account with a professional password.' :
                                        'Emergency bypass for Master Admin access.'}
                            </p>
                        </div>
                    )}

                    {mode === 'register' && (
                        <div className={styles.field}>
                            <label>Full Name</label>
                            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arjun Sharma" required />
                        </div>
                    )}

                    {mode !== 'reset' && (
                        <div className={styles.field}>
                            <label>Email Address</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@freshjuice.in" required />
                        </div>
                    )}

                    {mode === 'emergency' && (
                        <div className={styles.field}>
                            <label>Master Recovery Key</label>
                            <input className="input" type="password" value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} placeholder="••••••••••••••••" required />
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Refer to Internal Security Documentation</span>
                        </div>
                    )}

                    {(mode === 'login' || mode === 'register' || mode === 'reset' || mode === 'emergency') && (
                        <div className={styles.field}>
                            <label>{(mode === 'reset' || mode === 'emergency') ? 'New Password' : 'Password'}</label>
                            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                        </div>
                    )}

                    {(mode === 'reset' || mode === 'emergency') && (
                        <div className={styles.field}>
                            <label>Confirm New Password</label>
                            <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                        </div>
                    )}

                    {mode === 'register' && (
                        <div className={styles.field}>
                            <label>Requested Role</label>
                            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                                <option value="seller">Seller / POS</option>
                                <option value="manager">Store Manager</option>
                                <option value="procurement">Procurement Officer</option>
                                <option value="staff">Staff Member</option>
                            </select>
                        </div>
                    )}

                    <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: 14, fontSize: 16 }} disabled={loading || (mode === 'forgot' && resetCooldown > 0)}>
                        {loading ? '⏳ Processing...' :
                            mode === 'login' ? '🚀 Sign In' :
                                mode === 'register' ? '📝 Create Account' :
                                    mode === 'forgot' ? (resetCooldown > 0 ? `⏳ Wait ${resetCooldown}s` : '📨 Send Reset Link') :
                                        mode === 'reset' ? '💾 Update Password' : '🛡️ Reset Enterprise Access'}
                    </button>

                    {mode === 'login' && (
                        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setMode('forgot')}>
                                Forgot Password?
                            </button>
                            {isAdmin && (
                                <button type="button" className="btn btn-ghost" style={{ fontSize: 13, color: 'var(--primary)' }} onClick={() => setMode('emergency')}>
                                    🛠️ Enterprise Setup
                                </button>
                            )}
                        </div>
                    )}

                    {(mode === 'forgot' || mode === 'reset' || mode === 'emergency') && (
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                                ← Back to Sign In
                            </button>
                        </div>
                    )}

                    {mode === 'login' && biometricAvailable && (
                        <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={handleBiometric} disabled={loading}>
                            🔐 Quick Device Login
                        </button>
                    )}
                </form>

                <p className={styles.footer}>Enterprise Security · Role-Based Access Control</p>
            </div>
        </div>
    );
}
