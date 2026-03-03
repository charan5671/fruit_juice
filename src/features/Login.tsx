'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Login.module.css';

export default function Login() {
    const { signIn, signUp, biometricAvailable, biometricLogin } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('seller');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            if (mode === 'login') {
                const err = await signIn(email, password);
                if (err) setError(err.message);
            } else {
                if (!name.trim()) { setError('Full name is required'); setLoading(false); return; }
                if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
                const result = await signUp(email, password, name, role);
                if (result.error) setError(result.error);
                else setSuccess('✅ Registration complete! Your account is pending admin approval. You will be notified once approved.');
            }
        } catch {
            setError('Network error. Please check your connection and try again.');
        }
        setLoading(false);
    };

    const handleBiometric = async () => {
        setLoading(true); setError('');
        const savedEmail = await biometricLogin();
        if (savedEmail) {
            setEmail(savedEmail);
            setError('');
            setSuccess('Biometric verified! Enter your password to continue.');
        } else {
            setError('Biometric not available. Use email/password instead.');
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

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.tabs}>
                        <button type="button" className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
                        <button type="button" className={`${styles.tab} ${mode === 'signup' ? styles.activeTab : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Register</button>
                    </div>

                    {mode === 'signup' && (
                        <>
                            <div className={styles.field}>
                                <label>Full Name</label>
                                <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arjun Sharma" required />
                            </div>
                            <div className={styles.field}>
                                <label>Role</label>
                                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                                    <option value="seller">Seller</option>
                                    <option value="staff">Staff</option>
                                    <option value="manager">Manager</option>
                                </select>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Admin access requires separate admin provisioning</span>
                            </div>
                        </>
                    )}

                    <div className={styles.field}>
                        <label>Email Address</label>
                        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@freshjuice.in" required />
                    </div>

                    <div className={styles.field}>
                        <label>Password</label>
                        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
                    </div>

                    {error && <div className={styles.error}>⚠ {error}</div>}
                    {success && <div className={styles.success}>{success}</div>}

                    <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: 14, fontSize: 15 }} disabled={loading}>
                        {loading ? '⏳ Processing...' : mode === 'login' ? '🔑 Sign In' : '📝 Register'}
                    </button>

                    {mode === 'login' && biometricAvailable && (
                        <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={handleBiometric} disabled={loading}>
                            🔐 Use Biometric
                        </button>
                    )}
                </form>

                <p className={styles.footer}>Secured with Supabase Auth · AES-256 · TLS 1.3</p>
            </div>
        </div>
    );
}
