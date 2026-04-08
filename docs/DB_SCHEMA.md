# Database Schema (Production View)

Primary schema is created by `supabase_migration.sql`.

## Core Entities

- `employees` (auth-linked users, role, status, outlet mapping)
- `outlets` (business locations)
- `ingredients` (inventory stock + thresholds)
- `recipes` (sellable/production items with ingredient maps)
- `orders` (POS and delivery lifecycle)
- `production_logs` (batch production entries)
- `purchase_orders` (procurement pipeline)
- `suppliers` (vendors)
- `attendance`, `payroll` (workforce)
- `notifications`, `audit_log` (observability/governance)

## Relationships

- `employees.auth_uid -> auth.users.id`
- `employees.outlet_id -> outlets.id`
- `ingredients.outlet_id -> outlets.id`
- `orders.seller_id -> employees.id`
- `orders.outlet_id -> outlets.id`
- `purchase_orders.supplier_id -> suppliers.id`
- `attendance.employee_id -> employees.id`
- `payroll.employee_id -> employees.id`

## Constraints & Indexes

- Role/status checks on `employees`
- status checks on `orders`, `purchase_orders`, etc.
- unique `(employee_id, date)` on attendance
- unique `(employee_id, month)` on payroll
- indexes for frequent read keys (`auth_uid`, `outlet_id`, date/time fields)

## Security

- All major tables have RLS enabled.
- Policies use helper functions:
  - `get_my_role()`
  - `get_my_employee_id()`
- Orders/procurement/inventory writes are constrained by role policy.

## Normalization Notes

- Master data normalized into core tables.
- Selective JSONB fields are intentionally denormalized for:
  - order item snapshots
  - recipe ingredient compositions
  - supplier item catalogs

This balances query speed and UI simplicity while keeping critical relational integrity.
