# Staffly — Build Progress

Phases per PRD §17. Each phase advances only when its §14 gate tests pass against the
cloud Supabase project.

- [ ] **Phase 1 — Scaffold, Supabase, auth, role middleware, layout/sidebar**
  - Gate: Login + role-gating E2E (§14.5 happy path 1 & 5)
- [ ] **Phase 2 — Schema + RLS + triggers + seed**
  - Gate: §14.3 DB/RLS tests (trigger math; employee/admin cannot read payroll; cross-employee blocked)
- [ ] **Phase 3 — Profiles & shifts CRUD**
  - Gate: Profile edit, shift assign
- [ ] **Phase 4 — Check-in/out + work log + history**
  - Gate: §14.4 flows 1–3 (check-in idempotency; checkout computes hours + persists log; edit checkout recomputes + audit)
- [ ] **Phase 5 — Alert crons + email**
  - Gate: §14.4 flows 4–5 (missed-checkin alert once; missed-checkout alert then resolves)
- [ ] **Phase 6 — Leave module**
  - Gate: §14.4 flow 6 (annual over balance → unpaid overflow; approve → annual_used++)
- [ ] **Phase 7 — Hours analytics + reports + export**
  - Gate: §14.2 logic + report render
- [ ] **Phase 8 — Payroll + salary editor + payslip**
  - Gate: §14.2 payroll math + §14.5 E2E 4 (super-admin payroll run incl. overtime → finalise)
- [ ] **Phase 9 — Extras, PWA, audit, polish**
  - Gate: §14.7 Definition of Done

See `RUNLOG.md` for per-phase detail and `DECISIONS.md` for defaults chosen.
