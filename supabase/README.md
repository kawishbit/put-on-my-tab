Supabase schema and migration notes

Run the migration locally (Postgres) or paste into Supabase SQL editor.

Local with psql (Postgres must be accessible):

```bash
# from repository root
psql $DATABASE_URL -f supabase/migrations/001_init.sql
```

Using Supabase dashboard:
- Open SQL editor -> paste contents of `001_init.sql` -> run.

Notes:
- This migration creates base tables and helper triggers. It includes placeholders for Row-Level Security (RLS) policies — you should add policies matching your auth JWT claims.
- Balance calculation is left as a derived view; a production implementation should use transactions and a balance engine to maintain `users.current_balance` reliably (triggers or background worker).

Verify policies and triggers
----------------------------

A small verification script is provided to help confirm migrations, policies, and triggers are working. It will:

- Ensure an admin user exists (creates one if missing)
- Create a sample category
- Insert a deposit transaction and check that `users.current_balance` updates via triggers

IMPORTANT SAFETY: This script uses the Supabase Service Role Key and can modify your database. You must explicitly opt-in by setting `VERIFY_POLICIES=1` (or `VERIFY_POLICIES=true`) in the environment when running it. Example:

```bash
SUPABASE_URL=https://<project>.supabase.co \ 
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \ 
VERIFY_POLICIES=1 \ 
node scripts/verify_policies.js
```

Only run this in a secure, non-production environment unless you understand the implications.
