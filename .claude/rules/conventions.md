# Code Conventions — Softonoma Employee Portal

Next.js 14 (App Router, TS strict) + Supabase (Postgres + Auth + RLS) + Tailwind/shadcn-style UI.
Full architecture: `.claude/knowledgebase/01-architecture.md`.

## Structure
- Business logic in `lib/services/**` (reused by routes, scripts, tests); pure math in `lib/{hours,payroll}.ts`. Keep routes/UI thin.
- Reads: server components hit Supabase directly (RLS enforces). Writes: a client component via the browser client (RLS-guarded) **or** a route handler in `app/api/**` (use a route when you need the service-role key, file IO, or shared logic + an explicit role check).
- DB `snake_case`; TS `camelCase`. Every table has `created_at`/`updated_at` (trigger-maintained).
- Times stored UTC, shown Asia/Karachi — use `lib/time.ts` + `lib/utils.ts` helpers (`companyToday`, `formatTime12`, `formatHours`, `formatPKR`, `avatarUrl`, `ageFromDob`). Money = PKR. Don't re-implement these.

## RSC boundary (we hit this bug twice — important)
**Never import a value/const/function from a `"use client"` module into a server component.** It
resolves to a client-reference proxy → silent `NaN`/0-row grids or `"x is not a function"`. Put
shared values/helpers in a plain `lib/*` module and import from there in both server and client.
(See `lib/pagination.ts`, `lib/worklog.ts`.) The `typecheck-changed` hook warns on this.

## Pagination
Server pages read `?page&pageSize`, use `.range()` + `count:'exact'`, render `components/ui/pagination.tsx`.
Constants in `lib/pagination.ts` (NOT the client component). Sizes 10/25/50/100/200/300.

## UI
Match the existing light theme + shadcn-style primitives in `components/ui/*`. Every large grid:
pagination + empty state. Mutations: toast feedback. Inner pages: a back link.

## Migrations & data
SQL in `supabase/migrations/NNNN_name.sql`, applied to the **cloud** DB via `npm run db:migrate`
(idempotent runner; uses `SUPABASE_DB_URL` session pooler). Update `.claude/database/database.md`
in the same change. Seed = `supabase/seed.sql` + `scripts/seed.mjs`.
