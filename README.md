# Staffly — Employee Portal

A full-stack HR & workforce-management portal (attendance, shifts, leave, hours analytics,
work logs, profiles, payroll) built per `Staffly_PRD_v2.1.docx`. Next.js 14 (App Router,
TS strict) · Tailwind + shadcn/ui · Supabase (Postgres 17 + Auth + RLS) · Tiptap · Recharts.

## Setup

```bash
npm install
```

Environment variables live in `.env.local` (already configured for the cloud Supabase
project). Required keys:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only (seeding, cron) — never shipped to the browser |
| `SUPABASE_DB_URL` | Postgres connection for migrations/seed (Singapore session pooler) |
| `CRON_SECRET` | guards `/api/cron/*` |
| `RESEND_API_KEY` | email; **blank → console-stubbed** |
| `ADMIN_ALERT_EMAIL`, `APP_URL` | alert routing |

> The direct `DATABASE_URL` host is IPv6-only and may not resolve on all networks; tooling
> uses `SUPABASE_DB_URL` (the session pooler) which targets the same database.

## Database

```bash
npm run db:migrate   # apply supabase/migrations/*.sql to the cloud DB (idempotent)
npm run seed:test    # create demo auth users + seed data + print verification table
```

## Run

```bash
npm run dev          # http://localhost:3000
```

## Tests (PRD §14)

```bash
npm test             # §14.2 unit — pure hours & payroll math
npm run test:rls     # §14.3 DB/RLS against the cloud project
npm run test:int     # §14.4 integration flows + payroll simulation
npm run report       # full §14 protocol → PASS/FAIL table
```

## Demo logins (password `Test@12345`)

| Role | Email |
|------|-------|
| Super Admin | `founder@acme.test` |
| Admin / HR | `hr@acme.test` |
| Employee | `ali@acme.test` |

## Key rules enforced

- **Non-netting hours** (§10): extra hours never offset another day's deficit; summaries are
  gross. Implemented identically in the DB trigger and `lib/hours.ts`.
- **RLS** (§7): employees see only their own rows; **salary & payroll are `super_admin` only**
  (Admin/HR excluded). Cron routes require `Authorization: Bearer ${CRON_SECRET}`.

See `CLAUDE.md` (how we work) and `.claude/` — `knowledgebase/` (product, rules, status),
`database/database.md` (schema), `rules/`, `skills/`, `agents/`, and `PROGRESS.md` / `RUNLOG.md` /
`DECISIONS.md` — for full detail.
