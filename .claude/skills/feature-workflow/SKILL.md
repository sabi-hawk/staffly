---
name: feature-workflow
description: The end-to-end loop for any feature/bug/change on the Softonoma Employee Portal — capture the requirement, ground in the knowledge base, decide, implement, self-test (npm run report), validate with review subagents, verify in the browser, sync the knowledge base, and commit. Use whenever starting non-trivial work on this portal.
---

# Feature Workflow (lightweight, owner-driven)

How we actually build on this portal. Requirements come from the **owner in chat** (no FRDs, no
ClickUp, no per-task worktrees, no coverage-% gate). Be pragmatic; don't add ceremony. Run the
phases in order; don't skip the verify + KB-sync steps.

> Golden rules: ground in the KB before coding · keep the app shippable after each slice · the gate
> is `npm run report` + a browser check · update the KB in the same change · commit under sabi-hawk,
> push only when the owner asks · never touch secrets/`CREDENTIALS.md`.

## 1. Capture
Append the owner's requirement (dated) to `.claude/knowledgebase/06-requirements-changelog.md` before
implementing, so intent is never lost. Convert relative dates to absolute.

**Large/multi-module initiatives (the CRM expansion):** after logging to the changelog, also
consolidate the requirement into its **FRD** under `.claude/knowledgebase/frds/` (create one from
`_TEMPLATE.md` if the module has none). Mature the FRD with the owner (Draft → In Review → Approved);
only an **Approved** FRD is promoted to a `plans/` plan and built. See `frds/README.md`. (Small Tier-1
changes skip FRDs — changelog + build.)

## 2. Ground
Read the relevant KB docs (`.claude/knowledgebase/*`, `.claude/database/database.md`) and the code
you'll touch. **Reuse** existing helpers/services (`lib/time.ts`, `lib/utils.ts`, `lib/services/*`,
`lib/pagination.ts`). For a large/uncertain change, spawn the **context-gatherer** agent first.

## 3. Decide
Resolve ambiguities yourself and record notable choices in `DECISIONS.md`. **Ask the owner only**
when a choice is irreversible/costly, expands scope, conflicts with a prior requirement, or needs a
real secret. Otherwise pick the best option, note it, keep moving.

## 4. Implement (small slices)
Thin routes/UI; logic in `lib/services/**` + pure math in `lib/{hours,payroll}.ts`. Follow
`.claude/rules/conventions.md` (esp. the RSC client-import pitfall). New tables → migration with RLS
in the same file; apply via the `db-change` skill.

## 5. Self-test
`npx tsc --noEmit` → `npm run build` → `npm run report` (seeds + unit + RLS + integration). Add/adjust
tests for new behaviour. Loop until green.

## 6. Validate with subagents (non-trivial changes)
Spawn in parallel: **security-reviewer**, **quality-reviewer**, and for milestones **professional-qa**
(walks the whole flow vs intent, surfaces missing/incomplete features). Fix clear gaps; for scope
expansions, ask the owner.

## 7. Browser-verify (UI changes)
Use the **browser-verify** skill (Playwright headless → screenshots in `test-artifacts/`) and **read
the PNGs** to confirm it renders and works. This catches what unit tests miss.

## 8. Sync the knowledge base
Update `.claude/database/database.md` (any schema change) + the relevant
`.claude/knowledgebase/<module>` and the requirements changelog — in the **same** change as the code.

## 9. Commit (+ push when asked)
Commit per slice with a clear message (Co-Authored-By trailer). Push only when the owner asks
(`.claude/rules/git.md`). Don't open/merge PRs unless asked.

## 10. Production gate
Before calling a milestone done, verify `.claude/knowledgebase/reference/07-production-readiness.md`.

## Optional bigger initiatives
For a multi-step initiative the owner wants tracked, drop a short note folder under
`.claude/plans/` (see `.claude/plans/README.md`) — a one-page plan + a `tasks.md` checklist. This is
optional and lightweight; most chat-sized requests don't need it.
