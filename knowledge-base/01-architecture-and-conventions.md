# 01 — Architecture & Conventions

## Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router), TypeScript **strict** |
| UI | Tailwind CSS + shadcn-style primitives (`components/ui/*`), Inter font, lucide icons |
| DB | Supabase Postgres 17 with **Row Level Security** |
| Auth | Supabase Auth (email/password) via `@supabase/ssr` |
| Server logic | Route Handlers (`app/api/**`) + a reusable service layer (`lib/services/**`) |
| Rich text | Tiptap (work logs) · Charts: Recharts · Tables: hand-rolled + TanStack where needed |
| State/data | React Query + Zustand available; most reads are server components |
| Email | Resend, **console-stubbed** when `RESEND_API_KEY` is blank (`lib/email`) |
| Tests | Vitest (unit + cloud integration), Playwright (browser E2E) |
| Deploy | Vercel target (note FS caveat for avatar uploads — see data-model) |

## Folder structure
```
app/
  (auth)  login/                     login page
  (app)/                             authenticated shell (sidebar+topbar)
    dashboard, attendance, leaves, profile          (employee)
    admin/{dashboard,attendance,employees,employees/[id],leaves,reports,payroll,settings}
  api/                               route handlers (attendance, leaves, payroll, cron,
                                     reports, admin, upload)
components/
  ui/                                design-system primitives (button, card, table, badge,
                                     input, stat-card, pagination)
  layout/                            sidebar, topbar, app-shell
  attendance/ admin/ leaves/ profile/   feature components
lib/
  supabase/{client,server,admin,middleware}.ts
  services/{attendance,leaves,payroll,reports,crons}.ts   pure-ish business logic, reused by
                                     routes AND test/seed scripts
  hours.ts payroll.ts               PURE math (unit-tested, no I/O)
  types.ts utils.ts time.ts nav.ts auth.ts
supabase/
  migrations/*.sql                   applied in order to the cloud DB
  seed.sql                           data seed (run after auth users created)
scripts/                            db-migrate, seed, rls-test, final-report, verify-schema
tests/
  unit/                             Vitest pure-logic
  integration/                      Vitest against the cloud DB
  e2e/                              Playwright browser tests
knowledge-base/                     this folder (source of truth)
```

## Conventions
- **DB** identifiers `snake_case`; **TS** `camelCase`. Every table has `created_at`/`updated_at`
  (trigger-maintained).
- **Times** stored UTC (`timestamptz`); displayed **Asia/Karachi**. Use helpers in `lib/time.ts`
  (`companyToday`, `companyDow`, `resolveRange`) and `lib/utils.ts` (`formatTime12`, `formatHours`,
  `formatPKR`, `avatarUrl`, `ageFromDob`, `formatCode`). **Don't re-implement these.**
- **Money** PKR via `formatPKR`. Week starts Monday; default working days Mon–Fri unless the
  employee's shift says otherwise.
- **Business logic lives in `lib/services/**` and pure math in `lib/{hours,payroll}.ts`** so it's
  reused by API routes, seed, and tests. UI/route handlers should be thin.
- **Reads**: prefer server components hitting Supabase directly (RLS enforces access). **Writes**:
  either a client component using the browser Supabase client (RLS-guarded) or a route handler in
  `app/api/**` (use a route handler when you need the service-role key, file IO, or shared logic).
- **Pagination**: server pages read `?page&pageSize` and use `.range()` + `count:'exact'`; render
  `components/ui/pagination.tsx`. Page sizes: 10/25/50/100/200/300 (default 10).
- **Permissions**: enforce in three places — middleware (route gating), RLS (DB), and UI (hide
  controls). Never rely on UI alone.
- **New tables** must get RLS enabled + policies in the same migration. Compensation/payroll =
  super_admin only.
- Keep components small and match existing styling (light theme tokens in `tailwind.config.ts`).

## Data flow example (check-in)
`/attendance` (client `CheckWidget`) → `POST /api/attendance/check-in` → `lib/services/attendance.ts`
`checkIn()` (idempotent, snapshots expected hours, sets late) → DB trigger computes hours.
The same `checkIn()` is callable from scripts/tests.
