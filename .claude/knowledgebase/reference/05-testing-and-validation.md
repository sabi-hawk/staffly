# 05 — Testing & Validation

We test at three levels and self-validate with subagents + a browser pass before declaring done.

## 1. Unit (pure logic) — `tests/unit/*.test.ts`
- `lib/hours.ts` (non-netting, deficit/extra, lateness) and `lib/payroll.ts` (net, deductions,
  additions). Fast, deterministic, no network. Run: `npm test`.

## 2. Integration (against the cloud DB) — `tests/integration/*.test.ts`
- Real Supabase calls: trigger math, RLS (employee/admin cannot read payroll; cross-employee
  blocked), attendance flows (idempotent check-in, checkout, edit+audit), cron de-dup, leave
  rules (casual ≤2/mo, annual ≥21d, overflow→unpaid), payroll generation incl. additions.
- Canonical subject: **Muzammal Faiz**. Run: `npm run test:int` and `npm run test:rls`.

## 3. Browser E2E (Playwright) — `tests/e2e/*.spec.ts`
- Drives a real browser against the dev server; logs in per role; exercises login + role gating,
  check-in/out, leave apply/approve, payroll generate/finalise; **captures screenshots** to
  `test-artifacts/` so the agent can visually verify (read the PNGs) and the human can review.
- One-time: `npx playwright install chromium`. Run: `npm run test:e2e`. See
  [`../../CLAUDE.md`](../../CLAUDE.md) "Browser testing" for how the agent uses screenshots.

## Aggregate
- `npm run report` runs seed + unit + RLS + integration and prints a PASS/FAIL table.
- A change is not "done" until: `tsc --noEmit` clean, `npm run build` green, `npm run report`
  all-PASS, E2E smoke green, and the production-readiness checklist
  ([`07-production-readiness.md`](07-production-readiness.md)) passes.

## Self-validation with subagents (agent workflow)
After implementing a slice, the lead agent spawns review subagents to audit the diff against this
knowledge base (requirements coverage, RLS/permission leaks, missing pagination, broken business
rules, dead code). Findings are fixed before commit. See [`../../CLAUDE.md`](../../CLAUDE.md).

## Test data rules
- Never point tests at ad-hoc data; rely on `npm run seed:test` (deterministic canonical block for
  Muzammal). Integration tests clean up data they create.
