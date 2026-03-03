'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/lib/store';
import Login from '@/features/Login';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Dashboard from '@/features/Dashboard';
import POS from '@/features/POS';
import Inventory from '@/features/Inventory';
import Procurement from '@/features/Procurement';
import Workforce from '@/features/Attendance';
import Payroll from '@/features/Payroll';
import Analytics from '@/features/Analytics';
import Notifications from '@/features/Notifications';
import UserManagement from '@/features/UserManagement';
import Profile from '@/features/Profile';

const modules: Record<string, React.ComponentType> = {
  Dashboard, POS, Inventory, Procurement, Workforce, Payroll, Analytics, Notifications, UserManagement, Settings: Profile,
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['Dashboard', 'POS', 'Inventory', 'Procurement', 'Workforce', 'Payroll', 'Analytics', 'Notifications', 'UserManagement', 'Settings'],
  manager: ['Dashboard', 'POS', 'Inventory', 'Procurement', 'Workforce', 'Notifications', 'Settings'],
  seller: ['POS', 'Inventory', 'Workforce', 'Notifications', 'Settings'],
  staff: ['Workforce', 'Payroll', 'Notifications', 'Settings'],
};

export default function Home() {
  const { session, user, employeeProfile, loading: authLoading, signOut } = useAuth();
  const { activeTab, initialized, initialize, mobileMenuOpen, setMobileMenuOpen, currentRole, setActiveTab } = useStore();

  useEffect(() => {
    if (user && !initialized) initialize(user.id);
  }, [user, initialized, initialize]);

  // Role Gate check
  useEffect(() => {
    if (initialized && currentRole) {
      const allowed = ROLE_PERMISSIONS[currentRole] || [];
      if (!allowed.includes(activeTab)) {
        setActiveTab(allowed[0] as any);
      }
    }
  }, [initialized, currentRole, activeTab, setActiveTab]);

  // Loading
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🍹</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!session || !user) return <Login />;

  // Pending approval
  if (employeeProfile?.status === 'pending') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 56 }}>⏳</span>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Account Pending Approval</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
          Welcome, <strong>{employeeProfile.name}</strong>! Your account has been registered as <strong style={{ textTransform: 'capitalize' }}>{employeeProfile.role}</strong> and is awaiting administrator approval. You will be able to access the platform once an admin activates your account.
        </p>
        <button className="btn btn-outline" onClick={signOut} style={{ marginTop: 8 }}>← Sign Out</button>
      </div>
    );
  }

  // Terminated
  if (employeeProfile?.status === 'terminated') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 56 }}>🚫</span>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Your account has been deactivated. Contact your administrator.</p>
        <button className="btn btn-outline" onClick={signOut}>← Sign Out</button>
      </div>
    );
  }

  // Store loading
  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🍹</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Syncing with database...</div>
      </div>
    );
  }

  const Module = modules[activeTab] || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 95 }} />}
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-w)', paddingTop: 'calc(var(--topbar-h) + 32px)', paddingLeft: 'clamp(16px, 3vw, 32px)', paddingRight: 'clamp(16px, 3vw, 32px)', paddingBottom: 40, maxWidth: '100vw', transition: 'margin-left 0.3s' }}>
        <TopBar />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}><Module /></div>
      </main>
    </div>
  );
}
