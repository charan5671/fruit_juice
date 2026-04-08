import type { ActiveTab, Role } from './store';

/** Single source of truth: navigation + route guard + API-side mirror (documented in docs/ARCHITECTURE.md). */
export const ROLE_NAV: Record<Role, { label: ActiveTab; icon: string }[]> = {
  admin: [
    { label: 'Dashboard', icon: '📊' },
    { label: 'POS', icon: '🧾' },
    { label: 'Orders', icon: '📋' },
    { label: 'Shipping', icon: '🚛' },
    { label: 'Production', icon: '🏭' },
    { label: 'Inventory', icon: '📦' },
    { label: 'Procurement', icon: '🚚' },
    { label: 'Workforce', icon: '👥' },
    { label: 'Payroll', icon: '💰' },
    { label: 'Analytics', icon: '📈' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'UserManagement', icon: '⚙️' },
    { label: 'Settings', icon: '👤' },
  ],
  manager: [
    { label: 'Dashboard', icon: '📊' },
    { label: 'POS', icon: '🧾' },
    { label: 'Orders', icon: '📋' },
    { label: 'Shipping', icon: '🚛' },
    { label: 'Production', icon: '🏭' },
    { label: 'Inventory', icon: '📦' },
    { label: 'Procurement', icon: '🚚' },
    { label: 'Workforce', icon: '👥' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'Settings', icon: '👤' },
  ],
  procurement: [
    { label: 'Procurement', icon: '🚚' },
    { label: 'Inventory', icon: '📦' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'Settings', icon: '👤' },
  ],
  seller: [
    { label: 'POS', icon: '🧾' },
    { label: 'Orders', icon: '📋' },
    { label: 'Production', icon: '🏭' },
    { label: 'Inventory', icon: '📦' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'Settings', icon: '👤' },
  ],
  logistics: [
    { label: 'Shipping', icon: '🚛' },
    { label: 'Orders', icon: '📋' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'Settings', icon: '👤' },
  ],
  staff: [
    { label: 'Workforce', icon: '👥' },
    { label: 'Payroll', icon: '💰' },
    { label: 'Notifications', icon: '🔔' },
    { label: 'Settings', icon: '👤' },
  ],
};

export function allowedTabsForRole(role: Role): ActiveTab[] {
  return (ROLE_NAV[role] ?? ROLE_NAV.staff).map((item) => item.label);
}

export function canAccessTab(role: Role, tab: ActiveTab): boolean {
  return allowedTabsForRole(role).includes(tab);
}

export function defaultTabForRole(role: Role): ActiveTab {
  const tabs = allowedTabsForRole(role);
  return tabs[0] ?? 'Settings';
}
