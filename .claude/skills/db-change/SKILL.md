---
name: db-change
description: Add or change the database safely — write a migration with RLS, apply it to the cloud Supabase project, verify it, and update the knowledge base. Use whenever adding/altering a table, column, index, enum, trigger, or RLS policy.
---

# DB Change

Migrations are applied to the **cloud** Supabase project (no local DB). The runner is idempotent and
uses `SUPABASE_DB_URL` (Singapore session pooler).

## Steps
1. **Write** `supabase/migrations/NNNN_short_name.sql` (next number in sequence). Make it
   re-runnable: `create table if not exists`, `add column if not exists`, `drop policy if exists`
   before `create policy`, `do $$ ... exception when duplicate_object$$` for enums.
2. **RLS in the same file** for any new table: `enable row level security` + policies. Match the
   sensitivity model — salary/payroll/compensation/payslips/audit/login_events = `super_admin` only;
   employee-owned tables = `employee_id = auth.uid() or auth_role() in ('admin','super_admin')`.
   Add a `record_audit()` trigger + `set_updated_at` trigger where appropriate.
3. **Apply**: `npm run db:migrate`.
4. **Verify**: run a quick check (a `scripts/verify-schema.mjs`-style query, or inline `pg`) that the
   table/columns/RLS/policies/triggers exist. Confirm counts/values where relevant.
5. **Types**: update `lib/types.ts` to match.
6. **Seed**: update `supabase/seed.sql` (+ `scripts/seed.mjs` for auth users) so `npm run seed:test`
   reproduces the data. Re-seed and confirm.
7. **Sync KB**: update `.claude/database/database.md` (migration list + table + RLS + change log) in
   the same change.

## Gotchas
- `uuid` columns: no `LIKE`; use range/`in (...)`/cast.
- enum columns: cast text → `::enum_name`.
- Month-end: compute the real last day (never `-31`).
- The direct `DATABASE_URL` host is IPv6-only/unreachable here — tooling uses `SUPABASE_DB_URL`.
