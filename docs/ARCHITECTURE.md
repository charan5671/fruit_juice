# FreshJuice Enterprise Architecture

## System Design

- **Frontend:** Next.js App Router (client-side modules for POS, inventory, procurement, shipping, analytics)
- **State Management:** Zustand (`src/lib/store.ts`)
- **Auth + Data Layer:** Supabase Auth + Postgres + Realtime + RPC functions
- **Database Security:** Row Level Security (RLS) and policy gates in `supabase_migration.sql`
- **Testing:** Vitest unit tests (`src/lib/rbac.test.ts`)

## Clean Architecture Boundaries

- **Presentation Layer**
  - `src/features/*` = UI modules (Dashboard, POS, Orders, Shipping, etc.)
  - `src/components/*` = shared layout + navigation components
- **Application Layer**
  - `src/lib/store.ts` = app use-cases orchestrator (calls Supabase, normalizes state)
  - `src/hooks/useAuth.ts` = auth/session lifecycle
  - `src/lib/rbac.ts` = RBAC source of truth
- **Infrastructure Layer**
  - `src/lib/supabase.ts` = Supabase client bootstrap
  - `supabase_migration.sql` = schema + constraints + RLS + server-side business functions

## Runtime Flow (high-level)

1. User authenticates via Supabase (`useAuth`).
2. Employee profile is loaded from `employees` table.
3. Role is resolved and UI modules are gated through `rbac.ts`.
4. Business actions call:
   - direct table updates for simple CRUD
   - atomic RPC functions for critical transactional workflows (orders, production).
5. Realtime channel refreshes relevant modules.

## Security Model

- UI permission checks are convenience only.
- Authoritative enforcement is in Postgres RLS + function-level checks:
  - `get_my_role()`
  - `get_my_employee_id()`
  - policies on `orders`, `purchase_orders`, `ingredients`, etc.
- Critical state-changing workflows are moved into RPC functions to avoid partial writes.

## Scalability Notes

- Move large analytical queries to dedicated materialized views / scheduled jobs.
- Add pagination cursor strategy for `orders`, `notifications`, and history-heavy modules.
- Split `store.ts` into domain stores (`ordersStore`, `inventoryStore`, etc.) as modules grow.
- Introduce backend service tier (Node/Express or Nest) when:
  - multi-tenant support is required,
  - external integrations (payment/shipping providers) are added,
  - long-running jobs and queues are needed.

## Recommended Production Topology

- **Frontend:** Vercel / Netlify
- **Database/Auth:** Supabase managed Postgres/Auth
- **Monitoring:** Sentry + Supabase logs + uptime monitor
- **CI:** lint + test + build on pull requests
- **Backups:** automated daily DB backups + monthly restore drill
