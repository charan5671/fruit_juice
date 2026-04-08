import { describe, expect, it } from 'vitest';
import { allowedTabsForRole, canAccessTab, defaultTabForRole, ROLE_NAV } from './rbac';

describe('rbac', () => {
  it('defines the same tab sets for every role as ROLE_NAV keys', () => {
    for (const role of Object.keys(ROLE_NAV) as Array<keyof typeof ROLE_NAV>) {
      const fromNav = ROLE_NAV[role].map((x) => x.label);
      expect(allowedTabsForRole(role)).toEqual(fromNav);
    }
  });

  it('denies cross-role tabs', () => {
    expect(canAccessTab('staff', 'Dashboard')).toBe(false);
    expect(canAccessTab('seller', 'Payroll')).toBe(false);
    expect(canAccessTab('procurement', 'POS')).toBe(false);
    expect(canAccessTab('logistics', 'POS')).toBe(false);
  });

  it('defaultTabForRole returns first allowed tab', () => {
    expect(defaultTabForRole('seller')).toBe('POS');
    expect(defaultTabForRole('staff')).toBe('Workforce');
  });
});
