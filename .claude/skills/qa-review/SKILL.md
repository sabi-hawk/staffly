---
name: qa-review
description: Run a multi-agent review/QA pass before declaring a milestone shippable — spawn the security, quality, and professional-QA agents in parallel, triage findings, fix the clear gaps, and ask the owner about scope expansions. Use at milestones or when the owner asks for a QA pass.
---

# QA Review

A cheap insurance pass before shipping. The owner explicitly wants the QA to think like a human
tester and surface missing/incomplete things — not just lint the diff.

## Run (parallel subagents)
Spawn together (one message, multiple Agent calls):
- **security-reviewer** — secrets/RLS/role-gating/PII (`.claude/agents/security-reviewer.md`).
- **quality-reviewer** — business-rule regressions, RSC pitfall, tz/rounding, UX completeness, dead code.
- **professional-qa** — walks the whole product vs owner intent; missing/incomplete features + top-5.

Also run the built-ins: `/code-review` and `/security-review`.

## Triage
- **Fix clear gaps yourself** (bugs, dead ends, missing empty states, obvious omissions like "no way
  to edit X").
- **Ask the owner** for anything that expands scope or might conflict with their intent — phrase as
  "QA suggests X — want it?" (the owner has said they're happy to be asked for big/scope decisions).
- Re-run `npm run report` + browser-verify after fixes.

## Output to the owner
A short PASS/FAIL summary + the honest punch-list, with what you fixed and what needs their call.
