# Staffly — Engineering Guide (CLAUDE.md)

Staffly is a full-stack HR / workforce-management portal (attendance, shifts, leave,
hours analytics, work logs, profiles, payroll). Full spec: `Staffly_PRD_v2.1.docx`.

## Stack
- **Framework**: Next.js 14 (App Router), TypeScript (strict).
- **Styling**: Tailwind CSS + shadcn/ui (Radix), tokens in `tailwind.config.ts`, Inter font via `next/font`.
- **DB**: Supabase Postgres 17 with Row Level Security (RLS).
- **Auth**: Supabase Auth (email/password + magic link).
- **Realtime/Storage**: Supabase Realtime (live dashboard) + Storage (avatars, docs).
- **Server logic**: Route Handlers + Server Actions.
- **Background jobs**: Vercel Cron → guarded `/api/cron/*` routes.
- **Email**: Resend (stubbed to console when `RESEND_API_KEY` is blank — see `lib/email`).
- **Libs**: Tiptap (work logs), Recharts, TanStack Query + Table, Zustand, react-hook-form + zod, date-fns, framer-motion, sonner, lucide-react.
- **Tests**: Vitest + React Testing Library (unit/component), Playwright (E2E), SQL assertions for DB/RLS.

## Conventions
- DB identifiers `snake_case`; TS `camelCase`. Every table has `created_at` + `updated_at` (trigger-maintained).
- All times stored UTC (`timestamptz`); displayed in **Asia/Karachi**. Currency **PKR**. Week starts **Monday**. Default working days Mon–Fri unless a shift overrides.
- Pure, unit-testable math lives in `lib/hours.ts` and `lib/payroll.ts` — keep it free of I/O.
- Every `/api/cron/*` route MUST verify `Authorization: Bearer ${CRON_SECRET}` and reject otherwise.
- Service-role key is server-only; never shipped to the browser. CNIC and compensation never sent to clients lacking permission.

## The non-netting hours rule (founder requirement — §10.1)
Per day: `total = checkout − checkin`; `deficit = max(expected − total, 0)`; `extra = max(total − expected, 0)`.
**Extra hours on one day NEVER offset a deficit on another day.** Monthly summaries report
**gross** total deficit and **gross** total extra, separately. Overtime is paid on `extra_hours`
**only** for the `fixed_plus_overtime` salary type. Deficits are visibility-only and are **not**
auto-deducted (the founder decides). This is enforced identically in the DB trigger
(`compute_attendance_hours`, §6.3) and in `lib/hours.ts`.

## The RLS rule (§7)
RLS is enabled on every table.
- Employees can read/write **only their own** rows.
- Admin/HR can read all attendance/leave/profiles and approve leave, manage staff/shifts.
- **`salary_structures` and `payroll_runs` are `super_admin` ONLY.** Admin/HR are *deliberately*
  excluded from all compensation data — there is no admin read policy on those tables. If the
  company later wants HR to see payroll, it's a single policy change. Built locked-down by default.
- Caller role resolved via the `auth_role()` security-definer helper.

## Demo logins (after seeding) — password `Test@12345`
- **Super Admin**: `founder@acme.test`
- **Admin / HR**: `hr@acme.test`
- **Employee**: `ali@acme.test`

## Migrations (applied to the CLOUD DB)
Migrations live in `supabase/migrations/*.sql` and are applied **non-interactively to the cloud
Supabase project** via a Node runner (`npm run db:migrate`) using a Postgres connection string.
- The direct host in `DATABASE_URL` (`db.<ref>.supabase.co`) is **IPv6-only and does not resolve
  on all networks**, so the runner prefers **`SUPABASE_DB_URL`** — the **Session pooler**
  (`aws-1-ap-southeast-1.pooler.supabase.com:5432`, project region Singapore), which points at the
  **same database**. Verified: `select 1 => 1`, PostgreSQL 17.6.
- Auth users are seeded via `supabase.auth.admin.createUser` with the **service-role key** using the
  fixed UUIDs from §8, then `supabase/seed.sql` runs. See `npm run seed:test`.

## Key scripts
- `npm run dev` — run the app.
- `npm run db:migrate` — apply pending SQL migrations to the cloud DB.
- `npm run seed:test` — create demo auth users + seed data + print a verification table.
- `npm test` — Vitest unit/integration suite.
