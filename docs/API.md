# API & RPC Contracts

This application currently uses Supabase RPC and direct table operations from the frontend store.

## Auth APIs (Supabase)

- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signUp({ email, password, options })`
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- `supabase.auth.updateUser({ password | data })`
- `supabase.auth.signOut()`

## Core RPCs

## `create_order`
- **Purpose:** create order + deduct inventory + write audit + emit low-stock notifications.
- **Input:**
  - `p_items jsonb`
  - `p_total numeric`
  - `p_payment_method text`
  - `p_outlet_id bigint`
  - `p_seller_id bigint`
  - optional customer fields + status
- **Output:** order row as JSON.

## `log_production_batch`
- **Purpose:** atomically insert production log + deduct ingredient stock + write audit.
- **Input:**
  - `p_employee_id bigint`
  - `p_product_id bigint`
  - `p_quantity numeric`
  - `p_fruits_used jsonb`
  - `p_notes text`
  - `p_outlet_id bigint`
- **Output:** `{ success: true, log_id: number }`.

## `delete_production_log_and_restore`
- **Purpose:** atomically restore inventory from stored log + delete log + write audit.
- **Input:**
  - `p_employee_id bigint`
  - `p_log_id bigint`
- **Output:** `{ success: true }`.

## `reset_enterprise_admin`
- **Purpose:** controlled emergency recovery path for master admin.
- **Input:**
  - `p_email text`
  - `p_new_password text`
  - `p_recovery_key text`
- **Output:** `{ success: true }` or `{ error: "..." }`.

## Error Handling Contract

- RPC/db errors are surfaced as `Error(message)` from `src/lib/store.ts`.
- UI should display human-readable toasts/alerts and keep state consistent.
- No critical multi-write flow should happen client-side without transactional RPC.
