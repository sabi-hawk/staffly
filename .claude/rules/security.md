# Security Rules — Softonoma Employee Portal

Enforced by `.claude/hooks/block-secret-writes.mjs` and the `security-reviewer` agent.

## Secrets & credentials
- **Never** read, write, print, or commit `.env`, `.env.local`, `.env.*` (only `.env.example`),
  `*.pem`, `*.key`, or **`CREDENTIALS.md`** (local-only, git-ignored).
- Configuration comes from env vars. The service-role key is **server-only** (`lib/supabase/admin.ts`,
  route handlers, scripts) — never import it into a client component.
- **`DANGER_PASSWORD`** (server-only, optional) is the platform "danger password": a second factor on
  **super-admin hard deletes**. Every DELETE route for crucial data calls `requireDangerForSuper(req,
  role)` from `lib/danger.ts` (constant-time compare; `403 {danger:true}` when missing/wrong). Inactive
  until set (opt-in), gates super admins only. **Any NEW super-admin hard-delete route must call the
  guard** — the client wrapper (`DangerFetchInstaller`) already prompts+retries for every fetch, so the
  server guard is the one thing to remember. See DECISIONS #98.

## Auth & RLS (defense in depth)
- Enforce access in **three** layers: middleware (route gating), **Supabase RLS** (DB), and UI (hide controls). Never rely on UI alone.
- Salary, payroll, compensation, payslips, **login events** = **super_admin only**. Admin/HR excluded.
- **Audit log (activity log) is SCOPED** (FRD-06, since Plan 04): super_admin sees all; **admin + BD-Lead**
  see non-financial entries; a **BD** sees their own CRM records' history. **Financial/PII audit entries**
  (salary_structures, payroll_runs, compensation_components, payslip_components, deals, deal_documents,
  receiving_accounts, employee_private, employee_credentials, commission_policies) stay **super_admin
  only**. Enforced by the `audit_read` RLS policy (`0017`/`0018`). See DECISIONS.md #26.
- Sensitive PII (CNIC, bank) lives in `employee_private` (self or super_admin). Never put it on `profiles` (everyone-readable).
- Never trust client-supplied role/identity — resolve from the authenticated session server-side.
- Every new table: enable RLS + policies **in the same migration**.
- Cron routes require `Authorization: Bearer ${CRON_SECRET}` — checked via `isAuthorizedCron()`
  (`lib/cron-auth.ts`): **fail-closed** (unset `CRON_SECRET` → all requests rejected, no
  `Bearer undefined` bypass) + constant-time (`timingSafeEqual`) compare.

## Input & data
- Validate external input (route bodies, query, uploads) before use. Validate uploads by type/size.
- Don't leak CNIC/salary/compensation to employee/admin clients. No PII in logs, tests, or screenshots — use synthetic data.
- Deactivated employees (`status='inactive'`) must be blocked at middleware.

## Review gate
Before commit/push, the `security-reviewer` agent (and built-in `/security-review`) scan the diff for
secret leakage, missing RLS/role checks, unvalidated input, and PII exposure. Fix blockers first.
