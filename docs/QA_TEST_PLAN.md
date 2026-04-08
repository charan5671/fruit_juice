# QA Test Plan

## 1. Auth / Credential Access

- [ ] Valid login with normalized email (upper-case input still works)
- [ ] Invalid password shows controlled error
- [ ] Forgot password sends reset link
- [ ] Recovery link opens reset mode and updates password
- [ ] Sign out clears local profile/device cache

## 2. RBAC

- [ ] Admin can access all modules
- [ ] Seller cannot access Payroll/UserManagement
- [ ] Procurement can access Procurement/Inventory only (+Notifications/Settings)
- [ ] Logistics can access Shipping/Orders only (+Notifications/Settings)
- [ ] Manual navigation to blocked tab gets auto-corrected to allowed default

## 3. POS + Inventory Automation

- [ ] Complete sale creates order
- [ ] Inventory auto-deducts via `create_order` RPC
- [ ] Low stock notification generated at threshold

## 4. Production Atomicity

- [ ] Log production batch deducts inventory in one transaction
- [ ] Failure (insufficient stock) writes nothing partial
- [ ] Delete production log restores inventory atomically

## 5. Procurement

- [ ] Create/edit PO in draft
- [ ] Advance status transitions correctly
- [ ] Delivered PO updates inventory through DB automation (if trigger configured)

## 6. Shipping / Logistics

- [ ] Active orders appear in Shipping module
- [ ] Advance status updates order pipeline
- [ ] Cancel order works and is audited

## 7. Non-functional

- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Basic load test for orders list (pagination limits respected)
- [ ] Verify Supabase RLS blocks unauthorized writes using role mismatch account
