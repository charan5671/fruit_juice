'use client';
import { useStore } from '@/lib/store';
import { ROLE_NAV } from '@/lib/rbac';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const { currentRole, activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen, currentName } = useStore();
    const items = ROLE_NAV[currentRole] ?? ROLE_NAV.staff;

    return (
        <>
            {mobileMenuOpen && <div className={styles.overlay} onClick={() => setMobileMenuOpen(false)} />}
            <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ''}`}>
                <div className={styles.brand} onClick={() => setActiveTab('Dashboard')}>
                    <span className={styles.brandIcon}>🍹</span>
                    <div>
                        <div className={styles.brandName}>FreshJuice</div>
                        <div className={styles.brandName}>Enterprise</div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {items.map(item => (
                        <button key={item.label} className={`${styles.navBtn} ${activeTab === item.label ? styles.active : ''}`} onClick={() => setActiveTab(item.label)}>
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span>{item.label === 'UserManagement' ? 'Users' : item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className={styles.rolePicker}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                            {currentName ? currentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{currentName || 'User'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{currentRole}</div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
