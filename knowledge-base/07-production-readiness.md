# 07 — Production Readiness Checklist

Launch is days away. **No change is "done" until this passes.** The lead agent runs/verifies these
and fixes anything red before declaring shippable. Re-run before any release.

## Build & types
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run build` green (no errors; warnings reviewed).
- [ ] No `console.error`/leftover debug logs in shipped paths (email console-stub is intentional).

## Correctness (automated)
- [ ] `npm test` (unit) — all pass.
- [ ] `npm run test:rls` — all pass (payroll/compensation super-admin only; cross-employee blocked).
- [ ] `npm run test:int` — all pass (attendance/leave/payroll flows, cron de-dup).
- [ ] `npm run report` — full table all-PASS.

## Browser E2E (Playwright → screenshots in `test-artifacts/`)
- [ ] Login + role gating: employee redirected away from `/admin/*`; admin can't see payroll.
- [ ] Employee: check-in → live timer → check-out with work log → appears in history.
- [ ] Admin: approve a pending leave; add/convert a leave; edit attendance (both times).
- [ ] Super admin: open an employee (compensation visible), generate payroll, mark paid,
      download/print a payslip.
- [ ] Visual: light theme + Softonoma branding render; no broken layouts (review screenshots).

## Security & permissions (defense in depth)
- [ ] RLS verified for every sensitive table; service-role key only in server code.
- [ ] Middleware gates all authed routes; cron routes require `CRON_SECRET`.
- [ ] No CNIC/salary leaked to employee/admin clients.
- [ ] `.env.local` not committed; secrets only server-side.

## Data & ops
- [ ] All migrations applied to the cloud DB; `verify-schema` clean.
- [ ] Seed produces realistic data; canonical subject correct.
- [x] **Avatar uploads**: stored in Supabase Storage bucket `avatars` (serverless-safe). Run
      `npm run storage:setup` once per environment to ensure the bucket exists.
- [ ] Email: real `RESEND_API_KEY` set for production (otherwise alerts only log to console).
- [ ] Pagination present on every large grid; empty/loading/error states exist.

## UX polish
- [ ] Every async region has a loading/skeleton or instant server render; empty states informative.
- [ ] Mobile/responsive sanity on key pages.
- [ ] Toasts on every mutation; destructive actions confirm.

## Launch steps (when ready)
1. Decide avatar storage for prod (Supabase Storage recommended).
2. Set production env vars (Supabase keys, `RESEND_API_KEY`, `CRON_SECRET`, `APP_URL`).
3. Configure Vercel Cron (`vercel.json` already defines the schedules).
4. Final `npm run report` + E2E pass; tag the release.
