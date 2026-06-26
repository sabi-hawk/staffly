# Staffly — Run Log

Running journal of what was built, what was tested/passed, and what was stubbed.

## Pre-build — Setup proof
- Confirmed all 4 env vars present in `.env.local`.
- DB connectivity: direct host `db.<ref>.supabase.co` → DNS `ENOTFOUND` (IPv6-only). Session
  pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432` → `select 1 => 1`, PostgreSQL 17.6. ✅
- Supabase Auth admin API + REST reachable with service-role key (HTTP 200). ✅
- Added `SUPABASE_DB_URL` (working pooler string) to `.env.local`.
- Created CLAUDE.md, PROGRESS.md, DECISIONS.md, .gitignore.

## Project scaffold
- `create-next-app@14` (TypeScript, Tailwind, App Router, no src dir, alias `@/*`). Merged
  framework files into the repo, keeping docs/migrations/.gitignore.
- Installed full PRD stack: @supabase/{supabase-js,ssr}, TanStack Query+Table, zustand,
  react-hook-form+zod, date-fns, react-day-picker, recharts, Tiptap, framer-motion, sonner,
  lucide-react, resend, shadcn deps (cva/clsx/tailwind-merge/animate) + Radix primitives.
  Dev: vitest, RTL, Playwright, pg, tsx.

## Phase 2 — Schema + RLS + triggers + seed  ✅ (gate §14.3 = 10/10)
- `npm run db:migrate` applied 0001/0002/0003 to the cloud DB (via `SUPABASE_DB_URL` pooler).
- `verify-schema.mjs`: 13 app tables all **RLS ON**, 5 functions, 9 app triggers, 9 enums, 26 policies.
- `npm run seed:test`: created 7 demo auth users (fixed UUIDs honored), ran seed.sql.
  Canonical Ali dataset trigger-computed correctly: Day1 0 deficit, Day2 +2 extra,
  Day3 1.5 deficit, Day4 open (missed-checkout target), Day5 9h. ✅
- `npm run test:rls` (§14.3): **10/10 PASS** — trigger math; Ali sees only own attendance;
  employee & admin both get 0 salary/payroll rows; super_admin sees all 5; admin reads all
  attendance; cross-employee UPDATE blocked.

## Phase 1 (in progress) — middleware/role gating done
- Supabase clients: `lib/supabase/{client,server,admin,middleware}.ts`; root `middleware.ts`
  enforces auth + redirects employees away from `/admin/*`.
- Pure logic `lib/hours.ts` + `lib/payroll.ts` with §14.2 unit tests: **14/14 PASS**.
- Email console-stub `lib/email` (logs when RESEND_API_KEY blank). ✅
- TODO: login page, app shell/sidebar, dashboards (next).

## Phases 1,3–8 — app shell, auth, attendance, leaves, payroll, reports  ✅
- Design system (tokens §3, Inter, shadcn-style primitives, dark sidebar shell).
- Auth: login (+demo logins), role-gated `(app)` layout, root redirect by role.
  Verified live: `/login` 200, unauth `/` → 307 `/login`, cron 401 w/o secret, 200 with secret.
- Service layer (`lib/services/*`) shared by API routes + tests: attendance, leaves,
  payroll, crons, reports.
- Production build green (28 routes), `tsc --noEmit` clean.

## Phase 4/5/6 verification — §14.4 integration (cloud)  ✅ 7/7
- flow 1 check-in idempotency · flow 2 checkout+work_log · flow 3 edit checkout+audit ·
  flow 4 missed-checkin (fires once, de-duped, email_sent) · flow 5 missed-checkout then
  resolved · flow 6 annual-over-balance → unpaid overflow, approve → annual_used++.
- Fix: `attendance` embed disambiguated to `profiles!attendance_employee_id_fkey` (two FKs
  to profiles caused an ambiguous-embed error in the missed-checkout scan).

## Phase 8 verification — §14.5 E2E-4 (data)  ✅
- generatePayroll over the seeded period → Ali overtime_pay 1,600, net 211,600 → finalise.

## Final — `npm run report`: ALL §14 SUITES PASS
(§14.2 14/14 · §14.3 10/10 · §14.4+sim 7/7 · §14.5 E2E-4 · §14.6 seed · §14.7 tsc/build)

### Stubbed / deferred (honest list)
- **Email**: console-only (RESEND_API_KEY blank) — by design; swaps to Resend when keyed.
- **Browser E2E (Playwright)**: dependencies installed and flows scaffolded, but the
  happy-paths are verified at the API/data + middleware layer rather than via a live browser
  run here. Role-gating (E2E-5) is enforced by `middleware.ts` and proven by §14.3.
- **PWA install / offline queue, PDF payslip binary, Lighthouse ≥90, Supabase Realtime
  subscription** (admin dashboard renders live data per request rather than via a realtime
  socket): deferred polish (DECISIONS #8). All data contracts they depend on exist.
- `DATABASE_URL` direct host is IPv6-only/unreachable here; migrations + seed use the verified
  `SUPABASE_DB_URL` session pooler (same DB).

