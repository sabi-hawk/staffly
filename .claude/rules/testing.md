# Testing & Verification — Softonoma Employee Portal

Our gate is **`npm run report`** (the §14 protocol) + a **browser check**, not a coverage percentage.
Keep it pragmatic: test the rules that matter, verify the UI actually works.

## The suites
- **Unit** (`npm test`, Vitest) — pure logic in `lib/hours.ts`, `lib/payroll.ts`, etc. Deterministic, no network.
- **RLS** (`npm run test:rls`) — against the cloud DB: payroll/compensation/audit are super-admin only; employees see only their own rows; cross-employee writes blocked.
- **Integration** (`npm run test:int`, Vitest) — service-layer flows against the cloud: attendance (check-in idempotency, multi-session, edit+audit), leave rules (casual cap, annual accrual/notice, overflow), cron de-dup, payroll generation.
- **Report** (`npm run report`) — seeds canonical data then runs unit + RLS + integration + `tsc` and prints a PASS/FAIL table. **This is the gate.**

## Browser verification (mandatory for UI changes)
There's no in-IDE browser, so use **Playwright headless + screenshots** (`npm run test:e2e`, or an
ad-hoc script) → PNGs in `test-artifacts/`. **Read the screenshots** to confirm it renders/works.
See the `browser-verify` skill. This catches the bugs unit tests miss (it caught the RSC
client-import 0-row-grid bug and the broken alerts feed).

## Definition of done (a change is shippable when)
- `npx tsc --noEmit` clean and `npm run verify:build` green (isolated `.next-verify`; **never**
  `npm run build` while the owner's dev server may be running — shared `.next` corrupts it).
- `npm run report` → all suites PASS.
- The affected screens verified via screenshots (no broken layout / dead control).
- KB updated (`.claude/database/database.md` + relevant `knowledgebase/<module>/`).

## Canonical test data
Don't point tests at ad-hoc data — rely on `npm run seed:test`. Canonical attendance subject =
**Muzammal Faiz** (deterministic last-5-day pattern). Tests that mutate cloud data must clean up.
