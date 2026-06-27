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
| 14 | **Avatar uploads stored on local disk** (`public/uploads/avatars`). | Owner asked for a local upload dir for ~20–30 images. **Caveat**: Vercel serverless FS is read-only → switch to Supabase Storage before a Vercel deploy (noted in production-readiness). |
| 15 | **Light theme + Softonoma branding**; standalone Shifts page removed (shift now lives on the employee). | Owner feedback; reduces nav clutter. |
| 16 | **Audit visibility = super_admin only** (tightened from admin). | Audit rows include salary/compensation changes; keep compensation private. Generic DB triggers skip service-role/seed writes to keep the panel clean. |
| 17 | **Pagination constants live in `lib/pagination.ts`** (not the `"use client"` component). | Importing values from a client module into a server component yields a client-reference proxy (caused 0-row grids). |
| 18 | **Knowledge base + workflow-driven development** (`CLAUDE.md` + `knowledge-base/`). | Owner wants minimal involvement, no context repetition, and production readiness; agents read+update the KB and self-validate. |
