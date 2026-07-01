# Softonoma Employee Portal — Build Progress

> Detail lives in `knowledge-base/` (source of truth) and `RUNLOG.md`. This is the high-level
> checklist.

## v1 (Staffly core) — ✅ complete & cloud-verified
- [x] Schema + RLS + triggers + seed (§14.3)
- [x] Hours/payroll pure logic + unit tests (§14.2)
- [x] Auth + role middleware + app shell
- [x] Attendance (check-in/out, work logs), leaves, reports, payroll, cron alerts
- [x] §14 self-test protocol green

## v2 (Softonoma overhaul) — ✅ complete
- [x] **Phase 1** — Softonoma branding + light/modern theme
- [x] **Phase 2** — migration 0004 (employee fields, bank, dynamic compensation, payslips)
- [x] **Phase 3** — 7 real employees + logins + ~90-day attendance + compensation seed
- [x] **Phase 4** — reusable pagination + page-size; employee DOB/age; employees grid
- [x] **Phase 5** — Attendance v2 (edit both times, per-employee filter, range tabs, summary cards)
- [x] **Phase 6** — Employees v2 (rich detail, per-employee shift AM/PM, compensation editor,
      avatars, read-only self-profile) + private PII table
- [x] **Phase 7** — Leaves v2 (casual ≤2/mo, annual ≥21d, missing-day→leave conversion)
- [x] **Phase 8** — Reports v2 (leaves/missing + pagination/page-size)
- [x] **Phase 9** — Payroll v2 (dynamic additions + breakdown, payslip + PDF, paid/pending + history)
- [x] **Phase 9.5** — Comprehensive audit logging + super-admin Logs panel
- [x] **Phase 10** — repointed test suite to real employees + new rule tests; `npm run report` green
- [x] **Knowledge base + CLAUDE.md workflow + browser E2E (Playwright)**
- [x] **Production-readiness audit** (3 review subagents) + fixes (PII table, attendance-edit
      guard, timezone, annual quota, payroll route guards, avatar validation, etc.)

## Gates
- §14 suites: `npm run report` → all PASS (unit, RLS, integration+sim, seed, tsc).
- Browser E2E: `npm run test:e2e` (screenshots → `test-artifacts/`).
- Production readiness: `knowledgebase/reference/07-production-readiness.md`.

See `RUNLOG.md` (journal), `DECISIONS.md` (choices), `knowledge-base/` (full spec).
