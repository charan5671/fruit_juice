'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/lib/store';
import { allowedTabsForRole, canAccessTab } from '@/lib/rbac';
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
import Orders from '@/features/Orders';
import Production from '@/features/Production';
import Shipping from '@/features/Shipping';

const modules: Record<string, React.ComponentType> = {
  Dashboard, POS, Orders, Shipping, Production, Inventory, Procurement, Workforce, Payroll, Analytics, Notifications, UserManagement, Settings: Profile,
};

export default function Home() {
  const { session, user, employeeProfile, loading: authLoading, signOut } = useAuth();
  const { activeTab, initialized, initialize, currentRole, setActiveTab, _hasHydrated } = useStore();

  // Hydration guard moved BELOW all hooks to comply with Rules of Hooks

  useEffect(() => {
    if (_hasHydrated && session && user && !authLoading && !initialized && employeeProfile) {
      initialize({ id: user.id, email: user.email }, employeeProfile);
    }
  }, [_hasHydrated, session, user, employeeProfile, authLoading, initialized, initialize]);

  // Role gate: keep active tab within RBAC (same list as Sidebar)
  useEffect(() => {
    if (_hasHydrated && initialized && currentRole) {
      if (!canAccessTab(currentRole, activeTab)) {
        setActiveTab(allowedTabsForRole(currentRole)[0]);
      }
    }
  }, [_hasHydrated, initialized, currentRole, activeTab, setActiveTab]);

  // Hydration Guard — must be AFTER all hooks
  if (!_hasHydrated) return null;

  // Loading
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🍹</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Verifying session...</div>
      </div>
    );
  }

  // Not authenticated
  if (!session || !user) return <Login />;

  // Authenticated but missing profile (usually indicates DB trigger/policy issue)
  if (!employeeProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 56 }}>⚠️</span>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Profile Setup Incomplete</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
          Your account was authenticated, but the employee profile was not found in the database. Run the latest Supabase migration to enable auto-provisioning, then sign in again.
        </p>
        <button className="btn btn-outline" onClick={signOut}>← Sign Out</button>
      </div>
    );
  }

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
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Syncing enterprise data...</div>
      </div>
    );
  }

  const Module = modules[activeTab] || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      {/* Mobile overlay is rendered by Sidebar.tsx — removed duplicate here */}
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-w)', paddingTop: 'calc(var(--topbar-h) + 32px)', paddingLeft: 'clamp(16px, 3vw, 32px)', paddingRight: 'clamp(16px, 3vw, 32px)', paddingBottom: 40, maxWidth: '100vw', transition: 'margin-left 0.3s' }}>
        <TopBar />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}><Module /></div>
      </main>
    </div>
  );
}
