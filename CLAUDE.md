# CLAUDE.md — Softonoma Employee Portal

How any agent (or human) works in this repo. The detail lives in **`.claude/`** — this file is the
map. Keep it lightweight: requirements come from the **owner in chat** (no FRDs/tickets), work goes
straight to `main` under the repo's git identity, and the gate is `npm run report` + a browser check.

## 0. Prime directive — read `.claude/` first
Before non-trivial work, read:
- `.claude/knowledgebase/README.md` → product, architecture, **business rules**, current status, the **requirements changelog**.
- `.claude/database/database.md` → tables, RLS, triggers, migrations (keep it current with every schema change).
- `.claude/rules/` → `security.md`, `testing.md`, `conventions.md`, `git.md`.
Ground every decision in these; don't re-derive from memory. If something isn't covered, decide
sensibly and **write it down** in the KB.

## 1. What this is
**Softonoma Employee Portal** — internal HR/attendance/leave/payroll app. Roles: Employee, Admin/HR,
Super Admin. Next.js 14 (App Router, TS strict) + Supabase (Postgres 17 + Auth + RLS) + Tailwind/
shadcn-style UI. Cloud DB. Full detail in `.claude/knowledgebase/00-product-overview.md`.

## 2. Golden rules (never violate — detail in `.claude/rules/`)
1. **Non-netting hours**; **multi-session** day total = sum of worked sessions.
2. **Compensation/payroll/audit = super_admin only**; CNIC/bank in `employee_private`. Defense in depth: middleware + RLS + UI.
3. **Leave**: annual accrues 1/mo→8 (carry within year); casual 1/mo (no carry); probation = 0 annual + 1 casual/3mo, rest unpaid.
4. **RSC pitfall**: never import a value/const/function from a `"use client"` module into a server component — put shared helpers in `lib/*`.
5. New tables get **RLS + policies in the same migration**, applied to the **cloud** DB (`npm run db:migrate`).
6. Money PKR; time stored UTC, shown Asia/Karachi (use `lib/time.ts` / `lib/utils.ts`).

## 3. How we work — the `feature-workflow` skill
Every change follows `.claude/skills/feature-workflow/SKILL.md`:
**capture** the requirement (changelog) → **ground** in the KB/code (reuse `lib/services/*`, `lib/*`)
→ **decide** (record in `.claude/DECISIONS.md`; ask the owner only for big/irreversible/conflicting)
→ **implement** small slices → **self-test** (`tsc`, `build`, `npm run report`) → **validate** with
review subagents → **browser-verify** (Playwright screenshots) → **sync the KB** → **commit**
(push when asked). Production gate: `.claude/knowledgebase/07-production-readiness.md`.

## 4. Decide vs ask
Decide and proceed for naming, structure, defaults, copy, refactors, test data — anything resolvable
from the KB/conventions (note notable choices in `.claude/DECISIONS.md`). **Ask the owner** only when
a choice is irreversible/costly, expands scope, conflicts with a prior requirement, or needs a secret.

## 5. Skills & agents (`.claude/`)
- **Skills** (`.claude/skills/`): `feature-workflow`, `qa-review`, `db-change`, `browser-verify`, `find-skills`.
- **Agents** (`.claude/agents/`, read-only): `context-gatherer`, `security-reviewer`, `quality-reviewer`, `professional-qa`. Spawn the reviewers at milestones (the `qa-review` skill).
- **Hooks** (`.claude/hooks/`): block secret/credential writes; warn on the RSC client-import pitfall.

## 6. Commands
```
npm run dev            # app at http://localhost:3000
npm run db:migrate     # apply supabase/migrations/*.sql to the cloud DB
npm run storage:setup  # ensure the public "avatars" storage bucket
npm run seed:test      # demo/auth users + seed data + verification table
npm test | test:rls | test:int | report   # §14 suites (report = the gate)
npm run test:e2e       # Playwright browser E2E → test-artifacts/ screenshots
```

## 7. Git & docs
- Identity is local to this repo: `sabi-hawk <miansabby516@gmail.com>`; commit per slice, push when asked (`.claude/rules/git.md`). Never commit secrets / `CREDENTIALS.md`.
- Tracking docs live in `.claude/`: `PROGRESS.md`, `RUNLOG.md`, `DECISIONS.md`. Keep them + the KB current in the same change as the code.

## 8. For the owner
Just state the change in chat — I read the KB, log it, decide details, implement, test, browser-check,
update the KB, and keep the app shippable. I'll only ask when it's genuinely your call.
