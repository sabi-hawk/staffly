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

### Stubbed / deferred
- Email send is console-only (no Resend key) — by design.

