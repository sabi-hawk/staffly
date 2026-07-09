# Deployment & environments (dev vs prod DB)

How to run the app locally against either the **dummy** database or the **real production** database,
and how production is set up on Vercel. See also `.claude/BACKLOG.md` for the cron decision.

## The two databases (recommended)
Use **two Supabase projects** on your free account (the Free tier allows **2 projects**, each is its own
Postgres DB — this is standard and good practice):

- **DEV project** — your *current* Supabase project, full of demo/seed data (Shaiza, Muzammal, etc.).
  For local development and testing. Safe to wipe/reseed.
- **PROD project** — a **new, empty** project for `portal.softonoma.com`. Only the accounts you create
  (super admin / admin), then the real employees you add by hand. Never seeded with dummy data.

> Free projects pause after ~1 week idle — just un-pause from the dashboard. That's the only real Free
> caveat; fine for this.

### One-time setup of the PROD project
1. Create the new Supabase project. Note its URL, anon key, service-role key, and session-pooler DB URL.
2. Point local `APP_ENV=production` (see below) and run **`npm run db:migrate`** to apply the schema.
   (The runner now prints `Target: PRODUCTION DB (host)` so you can confirm before it runs.)
3. Run **`npm run storage:setup`** to create the `avatars` + `crm-docs` buckets on prod.
4. Create your super-admin (+ admin) accounts: **`npm run create:admins`** (respects `APP_ENV`, loads NO
   dummy data — just the two admin logins). Override the super admin, e.g.:
   `npm run create:admins -- --super-email you@softonoma.com --super-password 'Strong#Pass1' --super-name 'Your Name'`.
   Then sign in, change the password, and add everyone else from the app (People → Users).
   **Do NOT run `npm run seed:test` against prod** — it's dummy data and is blocked when
   `APP_ENV=production` (override only with `--force-prod`, which you shouldn't).

## Local toggle — `.env.local`
The app + scripts read four connection vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`. To flip between DBs
locally, put **both** sets in `.env.local` with `DEV_`/`PROD_` prefixes and pick one with `APP_ENV`:

```dotenv
# which database this local run targets: development (dummy) | production (real)
APP_ENV=development

# --- DEV (dummy) project ---
DEV_NEXT_PUBLIC_SUPABASE_URL=https://<dev-ref>.supabase.co
DEV_NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
DEV_SUPABASE_SERVICE_ROLE_KEY=<dev service role key>
DEV_SUPABASE_DB_URL=postgresql://...<dev session pooler>...

# --- PROD (real) project ---
PROD_NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
PROD_NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod anon key>
PROD_SUPABASE_SERVICE_ROLE_KEY=<prod service role key>
PROD_SUPABASE_DB_URL=postgresql://...<prod session pooler>...

# keep the rest as-is (CRON_SECRET, RESEND_API_KEY if set, etc.)
```

- `APP_ENV=development` → the app + every script use the DEV set (dummy data). `APP_ENV=production` → the
  PROD set (real data). The resolver (`scripts/lib/env.mjs → resolveEnv`) copies the chosen set into the
  plain names; `next.config.mjs` does the same before Next inlines the public vars.
- **Restart `npm run dev` after changing `APP_ENV`** (Next reads `next.config.mjs`/env at startup).
- A **badge in the top bar** shows **Dev DB** (green) or **Prod DB** (red) whenever you run locally, so
  you always know which database you're on. It never shows on the real Vercel deployment.
- Backward compatible: if you don't add the prefixes/`APP_ENV`, the plain names work exactly as before.

### Safety
- `npm run seed:test` refuses to run when `APP_ENV=production` (dummy data can't hit prod).
- `npm run db:migrate` prints the target env + host first — read it before confirming a prod migration.

## Vercel (production deployment)
On Vercel you do **not** use the `DEV_`/`PROD_` split — just set the **plain** names to the **PROD**
project, plus the app secrets:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_URL`, `CRON_SECRET`, and (when you want emails) `RESEND_API_KEY`, `ADMIN_ALERT_EMAIL`,
`APP_URL=https://portal.softonoma.com`. Optionally `NEXT_PUBLIC_APP_ENV=production` (the env badge is
hidden on Vercel regardless). Crons are disabled (`vercel.json` `"crons": []`); see `.claude/BACKLOG.md`.

## Typical workflow
- Day-to-day dev: `APP_ENV=development` → dummy DB, iterate, `npm run report`, commit, push (Vercel
  deploys prod automatically).
- Reproduce a prod issue locally: set `APP_ENV=production`, restart `npm run dev`, log in with your real
  admin account. The red **Prod DB** badge reminds you you're on live data — be careful.
