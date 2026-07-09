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

### Production bootstrap checklist (one-time, from local with `APP_ENV=production`)
Set `.env.local`'s `PROD_*` vars + `APP_ENV=production`, restart nothing (scripts read env fresh), then:
1. **Get the prod DB URL right.** In Supabase → prod project → **Settings → Database → Connection string →
   Session pooler** (NOT "Direct connection" — that's IPv6-only; use **Session pooler** for IPv4), copy
   the URI, put your prod DB password in it (URL-encode specials, `@`→`%40`) → that's `PROD_SUPABASE_DB_URL`.
   **The pooler host is region-specific** — if prod is in a different region than dev, the host differs
   (e.g. dev `aws-1-ap-southeast-1`, prod `aws-1-ap-northeast-2`). Verify:
   `node --input-type=module -e "import('./scripts/lib/env.mjs').then(async m=>{m.loadEnv();const pg=(await import('pg')).default;const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});try{await c.connect();console.log('OK');await c.end()}catch(e){console.log('FAIL',e.message)}})"`
2. **`npm run db:migrate`** → applies the schema (prints `Target: PRODUCTION DB (host)` first).
3. **`npm run storage:setup`** → creates the `avatars` + `crm-docs` buckets.
4. **`npm run create:admins`** → the super-admin + HR admin logins (no dummy data). Override the super
   admin: `npm run create:admins -- --super-email you@softonoma.com --super-password 'Strong#Pass1' --super-name 'Your Name'`.
5. **`npm run create:team`** → the real Softonoma team (accounts + profiles + shifts + role flags, NO
   attendance/leave/CRM/payroll/PII). `-- --no-founders` to skip the two founder super-admins. Idempotent.
6. Sign in at `portal.softonoma.com`, have everyone change their password, then manage users from the app
   (People → Users). **Never run `npm run seed:test` against prod** (dummy data; it's blocked when
   `APP_ENV=production`).
7. **Point Vercel at prod:** set the **plain** var names to the PROD project (+ `CRON_SECRET`, later
   `RESEND_API_KEY`) and redeploy.
8. Flip local back: `APP_ENV=development` (+ restart `npm run dev`).

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
