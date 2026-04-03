'use client';
import { useStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import styles from './TopBar.module.css';

export default function TopBar() {
    const { currentRole, currentName, theme, toggleTheme, mobileMenuOpen, setMobileMenuOpen, notifications, setActiveTab } = useStore();
    const { signOut, biometricAvailable, biometricRegister } = useAuth();
    const unread = notifications.filter(n => !n.read).length;

    return (
        <header className={`${styles.topbar} glass`}>
            <div className={styles.left}>
                <button className={styles.burger} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>
            </div>
            <div className={styles.right}>
                <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Theme">{theme === 'light' ? '🌙' : '☀️'}</button>
                <button className={styles.iconBtn} style={{ position: 'relative' }} onClick={() => setActiveTab('Notifications')} aria-label="Notifications">
                    🔔 {unread > 0 && <span className={styles.dot}>{unread}</span>}
                </button>
                {biometricAvailable && (
                    <button className={styles.iconBtn} onClick={biometricRegister} title="Register Biometric" aria-label="Biometric">🔐</button>
                )}
                <div className={styles.user}>
                    <div className={styles.avatar}>{currentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{currentName}</div>
                        <div className={styles.userRole}>{currentRole}</div>
                    </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={signOut} style={{ marginLeft: 8 }}>Logout</button>
            </div>
        </header>
    );
}
