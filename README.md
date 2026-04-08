# FreshJuice Enterprise App

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

Then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. In Supabase SQL editor, run `supabase_migration.sql`.

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth Notes

- Account provisioning relies on the `auth.users` trigger in `supabase_migration.sql`.
- Password recovery uses Supabase recovery links and routes back to this app.
- If login succeeds but profile is missing, re-run the migration and verify trigger creation.

## Quality Gates

- Run tests: `npm run test`
- Build for production: `npm run build`

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- API / RPC contracts: `docs/API.md`
- Database overview: `docs/DB_SCHEMA.md`
- QA checklist: `docs/QA_TEST_PLAN.md`
