# Staffly — Decisions Log

Sensible defaults chosen autonomously where the spec was silent or ambiguous, per the
build instruction to keep going rather than ask.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Migrations applied via `SUPABASE_DB_URL` (Session pooler, Singapore), not the direct `DATABASE_URL`.** | Direct host `db.<ref>.supabase.co` is IPv6-only and returns `ENOTFOUND` on networks without IPv6 (incl. this env). The pooler points at the **same** database; `select 1` verified, PostgreSQL 17.6. Runner prefers `SUPABASE_DB_URL`, falls back to `DATABASE_URL`. |
| 2 | **Migration tooling = custom Node runner (`pg`), not the Supabase CLI.** | `SUPABASE_ACCESS_TOKEN` in `.env.local` is a placeholder (`sbp_xxxxxxxx`), so `supabase link`/`db push` can't authenticate non-interactively. A `pg`-based runner with a `schema_migrations` ledger is deterministic and idempotent. |
| 3 | **Build committed on `main`.** | Greenfield repo with zero prior commits; `main` is the intended project branch. Per-phase commits as requested. |
| 4 | **Package manager = npm.** | Already present; no lockfile preference expressed. |
| 5 | **Email is console-stubbed** via `lib/email` `EmailProvider` interface whenever `RESEND_API_KEY` is blank (current state). | Per instruction; swaps to real Resend client when a key is present, same call sites. |
| 6 | **Seed reconciles with the `handle_new_user` trigger.** | §6.2 auto-inserts a `profiles` row on auth signup. Seed creates auth users first (fixed UUIDs), then `seed.sql` upserts/updates profile fields (`on conflict (id) do update`) so trigger + seed don't collide. |
| 7 | **`days_count` / working-day math uses `working_days()` (§6.4)** excluding holidays and respecting each shift's `days_of_week`. | Single source of truth shared by leave + payroll. |
| 8 | **Realtime, Storage, PDF payslip, PWA, Lighthouse** treated as best-effort polish (Phase 9). | Core verifiable contracts (DB/RLS/trigger math, hours, payroll, leave, crons) are prioritized for testing against the live DB. Anything stubbed is noted in `RUNLOG.md`. |
| 9 | **Timezone Asia/Karachi, currency PKR, week starts Monday** | PRD §18.1 defaults. |

## v2 (Softonoma overhaul) decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 10 | **Replaced the 5 fake employees with the 7 real staff**; tests repointed to **Muzammal Faiz** as canonical subject. | Owner wants real data in a production launch; demo admin logins (founder/hr) kept. |
| 11 | **Employees get logins now** (email + `Softonoma@123`). | Enables the employee experience immediately; owner confirmed. |
| 12 | **Compensation is fully dynamic** (`compensation_components`: label/amount/description/recurring) replacing fixed OT/commission/benefits; base salary stays fixed. | Owner needs arbitrary categories (fuel, deal commission, extra-hours, bonus). Legacy salary columns left nullable for back-compat. |
| 13 | **Payslip = printable page + browser "Save as PDF"** (print CSS), no heavy PDF lib. | Reliable, zero-dependency, production-safe; can add a server PDF lib later if needed. |
| 14 | **Avatar uploads stored in Supabase Storage** (public bucket `avatars`, key `<employee_id>.<ext>`). | Serverless-safe (works on Vercel). Uploaded via `/api/upload/avatar` with service-role after a self-or-admin check; `profiles.avatar_url` holds the public URL. `npm run storage:setup` provisions the bucket. (Superseded the earlier local-disk approach.) |
| 15 | **Light theme + Softonoma branding**; standalone Shifts page removed (shift now lives on the employee). | Owner feedback; reduces nav clutter. |
| 16 | **Audit visibility = super_admin only** (tightened from admin). | Audit rows include salary/compensation changes; keep compensation private. Generic DB triggers skip service-role/seed writes to keep the panel clean. |
| 17 | **Pagination constants live in `lib/pagination.ts`** (not the `"use client"` component). | Importing values from a client module into a server component yields a client-reference proxy (caused 0-row grids). |
| 18 | **Knowledge base + workflow-driven development** (`CLAUDE.md` + `knowledge-base/`). | Owner wants minimal involvement, no context repetition, and production readiness; agents read+update the KB and self-validate. |
| 19 | **Username login** (`first.last`) for employees; **email login** for the two admin accounts (`super.admin@softonoma.com`, `admin@softonoma.com`). | Owner spec. Username→email resolved pre-auth via a security-definer RPC; `profiles` read tightened to authenticated-only to stop anon enumeration. |
| 20 | **Employee password convention `Softonoma@<employee_code>`**; admin passwords `Softonoma@<random>`. Admin/super-admin can edit username + reset password from the employee panel. | Owner spec. |
| 21 | **Portal password stored in `employee_credentials` (plaintext)** so admins can view/copy/share it. | Explicit owner requirement (visible + copyable credentials for an internal tool). Restricted by RLS to admin/super-admin/self; auth itself still uses Supabase's hashed password. Tradeoff accepted; revisit if the tool goes external. |
| 22 | **Deactivated employees blocked at middleware** (status=inactive → signed out), records retained. | Owner spec. |
| 23 | **Removed all fabricated data** (bank/IBAN/DOB/invented compensation). Only sheet-provided data seeded; real bank details added from the owner's payslips (Areeba pending). BD commission %s in `commission_policies`. | Owner: no fake data in production. |
| 24 | **CRM `receiving_accounts` (incl. bank account numbers) ARE audited** — `record_audit()` stores the full row in `audit_log.before/after`. | Deliberate: `audit_log` is super-admin-only read (payroll tier) and admins need a change trail for financial accounts. Contrast `dev_profile_secrets` (passwords), which are NOT audited. Revisit if audit visibility widens. |
| 25 | **CRM dev profiles = `dev_profiles`; `auth_is_bd()` keys on the text `department`; a guard trigger blocks non-admin self-edits of role/status/department/CRM flags.** | Naming collision with the load-bearing `profiles` table; free-text `department` is what the app+seed maintain (the `departments` lookup+FK is forward structure until the employee editor writes it). |
