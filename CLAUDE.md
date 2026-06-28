# CLAUDE.md — How we work on the Softonoma Employee Portal

This file tells any agent (or human) **how to work in this repo**. It is paired with the
**knowledge base** (`knowledge-base/`) which tells you **what we're building**. Read both.

---

## 0. Prime directive — read the knowledge base first
**Before doing anything**, read `knowledge-base/README.md` and the docs it points to (product
overview, architecture, data model, business rules, current v2 status, testing, production
readiness, requirements changelog). The knowledge base is the **source of truth**. If this file
and the KB disagree, the KB wins for "what", this file wins for "how".

Do **not** re-derive product facts from memory or from a single file — ground every decision in
the KB. If something isn't covered, decide sensibly (see §4) and **write it down** in the KB.

## 1. What this product is (one line)
**Softonoma Employee Portal** — internal HR/attendance/leave/payroll app. Roles: Employee, Admin/HR,
Super Admin. Stack: Next.js 14 (App Router, TS strict) + Supabase (Postgres 17 + Auth + RLS) +
Tailwind/shadcn-style UI. Cloud DB. Full detail: `knowledge-base/00-product-overview.md`.

## 2. Golden rules (never violate — detail in `knowledge-base/03-business-rules.md`)
1. **Non-netting hours**: extra hours one day never cancel another day's deficit; summaries are gross.
2. **Compensation privacy**: salary, payroll, compensation, payslips = **Super Admin only**. Admin/HR
   excluded. Enforce in middleware **and** RLS **and** UI.
3. **Employees can't edit their own profile fields** (only their photo). Admin/Super Admin edit.
4. **Leave**: casual ≤2/month; annual 8/yr, ≥21-day notice (admin override); unpaid unlimited/deducted.
5. **Money** = PKR; **time** = stored UTC, shown Asia/Karachi; **week** starts Monday.
6. New tables get **RLS + policies in the same migration**. Migrations are applied to the **cloud** DB.

## 3. The development workflow (own it end-to-end)
For every task, run this loop. Optimise for the owner needing to do **zero** manual checking.

1. **Capture** — append the new requirement to `knowledge-base/06-requirements-changelog.md`
   (dated), so intent is never lost.
2. **Ground** — read the relevant KB docs + the actual code you'll touch (reuse existing helpers in
   `lib/` — don't reinvent `formatHours`, `working_days`, `buildEmployeeReport`, etc.).
3. **Decide** — resolve ambiguities yourself (see §4) and record non-obvious choices in
   `DECISIONS.md`.
4. **Implement in small slices** — thin routes/UI, logic in `lib/services/**` + pure math in
   `lib/{hours,payroll}.ts`. Match existing styling and conventions.
5. **Self-test** — `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:rls`,
   `npm run test:int` (and `npm run report` for anything cross-cutting). Add/adjust tests for new
   behaviour. Fix until green.
6. **Validate with subagents** — spawn review subagents to audit the diff against the KB:
   requirement coverage, permission/RLS leaks, missing pagination/empty-states, broken business
   rules, dead code, accessibility. Fix findings before commit. (See §5.)
7. **Browser-check** — run the Playwright E2E for affected flows; screenshots land in
   `test-artifacts/`. **Read the screenshots** and confirm it actually looks/works right. (See §6.)
8. **Sync the KB** — update `02-data-model.md` / `03-business-rules.md` / `04-v2-…` / changelog so
   the KB always matches reality.
9. **Commit** — one focused commit per slice (see §7).
10. **Production gate** — before declaring a task done, verify
    `knowledge-base/07-production-readiness.md`. We are launching within days: **leave the app
    shippable after every task** — no half-finished features on shared paths.

## 4. Decision-making autonomy
The owner wants minimal involvement. **Decide and proceed** for: naming, folder placement,
component structure, sensible defaults, copy/labels, validation messages, test data, refactors that
preserve behaviour, and anything resolvable from the KB or conventions. Record notable choices in
`DECISIONS.md`.

**Only ask the owner** when a choice is (a) irreversible or costly to undo, (b) changes product
scope or external-facing behaviour in a way the KB doesn't cover, or (c) needs a real-world secret
or credential. Otherwise pick the best option, note it, and keep moving.

## 5. Self-validation with subagents
After a slice is implemented and green, spawn focused review subagents (general-purpose/Explore) —
e.g. in parallel:
- **Requirements auditor**: read `knowledge-base/06-requirements-changelog.md` + `04-…` and check
  every relevant requirement is actually implemented in the diff; list gaps.
- **Security/permissions auditor**: verify RLS + middleware + UI gating; hunt for salary/CNIC leaks
  to employee/admin; check cron `CRON_SECRET`.
- **Quality auditor**: pagination/empty/loading/error states, reused helpers, dead code, type
  safety, business-rule regressions (non-netting, leave quotas).
Treat their findings as a punch-list; fix before commit. Use subagents liberally for audits — they
are cheap insurance for a production launch.

## 6. Browser testing (this environment)
There is no in-IDE clickable browser here, so we use **Playwright headless + screenshots**, which an
agent can both run (terminal) and verify (read the PNGs). This is the recommended approach.
- One-time: `npx playwright install chromium`.
- Run: `npm run test:e2e` (config starts the dev server, logs in per role, exercises flows, writes
  PNGs to `test-artifacts/`).
- The agent then **reads the screenshots** to confirm layout/behaviour, and iterates.
- For ad-hoc visual checks: `npm run dev` then a short Playwright script that navigates + screenshots
  a page; read the PNG.
- Alternative (optional): a Playwright **MCP server** gives interactive browser control; if the
  owner enables it, prefer it for exploratory clicking. Until then, headless+screenshots is the
  standard.

## 7. Git & delivery
- Identity is **local to this repo**: `sabi-hawk <miansabby516@gmail.com>` (already configured).
- Commit **per slice/phase** with a clear message; end messages with the Co-Authored-By trailer.
- **Do not push** unless the owner asks. Remote: `git@github.com:sabi-hawk/staffly.git`.
- Never commit secrets; `.env.local`, `node_modules`, `.next`, `test-artifacts/`, uploaded avatars
  are git-ignored.

## 8. Commands cheat sheet
```
npm run dev            # run app (http://localhost:3000)
npm run db:migrate     # apply supabase/migrations/*.sql to the cloud DB (idempotent)
npm run storage:setup  # create/verify the public "avatars" Storage bucket
npm run seed:test      # create demo/auth users + seed data + verification table
npm test               # Vitest unit (pure logic)
npm run test:rls       # RLS tests vs cloud
npm run test:int       # integration flows vs cloud
npm run test:e2e       # Playwright browser E2E → test-artifacts/ screenshots
npm run report         # seed + unit + rls + integration → PASS/FAIL table
```

## 9. Tracking files
- `PROGRESS.md` — phase checklist. `DECISIONS.md` — choices + rationale. `RUNLOG.md` — running
  journal of what was built/tested/stubbed. Keep these and the **knowledge base** current.

## 10. How to prompt me (for the owner)
You don't need to re-explain the product each time — I read the knowledge base. Just state the
change ("add X to payroll", "fix Y on attendance"). I'll log it, decide the details, implement,
test, self-validate, browser-check, update the KB, and keep the app shippable. Tell me only the
*intent*; I'll own the rest. If you ever want me to ask more before acting, say "plan first".
