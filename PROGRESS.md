# Staffly — Build Progress

Phases per PRD §17. Each phase advances only when its §14 gate tests pass against the
cloud Supabase project. **All §14 suites pass** — see `npm run report`.

- [x] **Phase 1 — Scaffold, Supabase, auth, role middleware, layout/sidebar**
  - Gate: Login + role gating — login 200, unauth→/login (307), employee→/admin redirect (middleware). ✅
- [x] **Phase 2 — Schema + RLS + triggers + seed**
  - Gate: §14.3 DB/RLS — **10/10**. ✅
- [x] **Phase 3 — Profiles & shifts CRUD**
  - Gate: Profile edit (self-update RLS), shift assign/list. ✅
- [x] **Phase 4 — Check-in/out + work log + history**
  - Gate: §14.4 flows 1–3 — idempotent check-in, checkout+log, edit+audit. ✅
- [x] **Phase 5 — Alert crons + email**
  - Gate: §14.4 flows 4–5 — missed check-in (once, de-duped), missed checkout then resolved. ✅
- [x] **Phase 6 — Leave module**
  - Gate: §14.4 flow 6 — annual over balance → unpaid overflow; approve → annual_used++. ✅
- [x] **Phase 7 — Hours analytics + reports + export**
  - Gate: §14.2 logic + report render (CSV export, gross non-netting totals). ✅
- [x] **Phase 8 — Payroll + salary editor + payslip**
  - Gate: §14.2 payroll + §14.5 E2E-4 — Ali run incl. overtime (1,600) → finalise. ✅
- [x] **Phase 9 — Extras, PWA, audit, polish**
  - Gate: §14.7 Definition of Done — tsc clean, production build green, audit_log on edits,
    alerts feed, announcements/holidays tables, command-palette affordance. (PWA + Lighthouse:
    see DECISIONS #8 — deferred polish.)

## Final §14 result (`npm run report`)
| Test | Result |
|------|--------|
| §14.2 Unit — hours & payroll (14/14) | PASS |
| §14.3 DB / RLS (10/10) | PASS |
| §14.4 Integration flows 1–6 + sim (7/7) | PASS |
| §14.5 E2E-4 payroll incl. overtime → finalise | PASS |
| §14.6 Seed-and-verify (canonical hours) | PASS |
| §14.7 tsc --noEmit clean + build green | PASS |

See `RUNLOG.md` for detail and `DECISIONS.md` for defaults chosen.
