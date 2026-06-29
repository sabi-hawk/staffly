# Developer Guide — working with Claude on this repo

How to actually *use* the workflow in `.claude/`. Read this once; it's the operating manual for every
developer (and for Claude). The short version: **describe what you want in plain language; Claude
grounds in the knowledge base, agrees the scope with you, builds it, proves it works, and keeps the
knowledge base current.** No FRDs, no tickets required.

> If `CLAUDE.md` is the map and the `.claude/skills`/`agents`/`rules` are the machinery, this guide is
> "how a human drives it."

---

## 1. The mental model

Three things are always true:

1. **The knowledge base is the source of truth.** `.claude/knowledgebase/` (what we're building +
   business rules), `.claude/database/database.md` (schema). Claude reads it before working and
   updates it in the *same change* as the code. This is why a fresh session can pick up with full
   context — nothing lives only in someone's head or a chat log.
2. **Every change runs the same loop** (the `feature-workflow` skill): capture → ground → decide →
   implement → self-test → review → verify → sync KB → commit.
3. **Lightweight by default.** Requirements come from *you*, in chat. Ceremony (a written plan, a
   review pass) is added only when the size of the work justifies it.

---

## 2. Do we need an FRD?

**No.** An FRD (Functional Requirements Document) is a formal "what this feature must do" spec. We
don't write them. But the *value* of an FRD — a captured, agreed statement of the requirement so it's
never lost — is kept in two lighter forms:

| Need | We use | When |
|------|--------|------|
| Record "you asked for X" | a dated line in `knowledgebase/06-requirements-changelog.md` | every requirement |
| A short, agreed spec before building something big | a one-page `plans/<NN-name>/plan.md` | multi-step initiatives |

If you ever want the FRD feel, say **"write this up as a plan first"** — Claude drafts the one-pager
from your description, you approve it, then build. It's an FRD in spirit, one page instead of ten.

---

## 3. Two tiers of work

### Tier 1 — a small change (most requests)
A bug, a tweak, a single screen, a rule adjustment. Just describe it. Claude:
logs it to the changelog → implements → runs the gate (`npm run report`) → browser-verifies →
updates the KB → commits. You'll get a summary; push when you ask.

> You don't need to do anything special. Tier 1 is the default.

### Tier 2 — a real feature / initiative (the plan lifecycle)
Something multi-step, cross-cutting, or worth tracking across sessions. This is where we discuss
first and use the plan folders. It flows through four states — **the folder a plan lives in IS its
status**:

```
 DISCUSS ─▶ CAPTURE (plan.md) ─▶ plans/upcoming/ ─▶ plans/inprogress/ (+tasks.md) ─▶ plans/done/
    │            │                     │                   │                            │
 we talk,   Claude writes a       agreed but           actively built               shipped; durable
 Claude     one-page spec;        not started yet      via feature-workflow          knowledge folded
 asks Qs    you approve it                             (gate + browser verify)       into knowledgebase/
```

**The two decision gates** (Claude will ask; you decide):
1. After discussing → *"Shall I write this up as a plan?"* → creates `plans/upcoming/NN-name/plan.md`.
2. When you're ready to build → *"Shall I move it to in-progress and start?"* → moves to
   `plans/inprogress/`, adds a `tasks.md` checklist, and implementation begins.

On completion, Claude folds the durable knowledge into `knowledgebase/<module>` + `database.md` and
moves the folder to `plans/done/` as the permanent record.

**A plan folder holds:**
- `plan.md` — one page: what & why, the approach, key files, the rules/acceptance, how we'll verify.
- `tasks.md` — a `- [ ] / - [x]` checklist (added when it goes in-progress), kept current so a
  resuming session never loses the thread.

> Not sure which tier? Just say so — Claude will recommend one. Rule of thumb: if it needs a
> discussion or spans several days/sessions, it's Tier 2.

---

## 4. How to phrase a request

Describe the **problem and the outcome**, not the implementation. Plain language is fine.

- ✅ "Employees on probation shouldn't see annual leave at all, and the apply button should explain why."
- ✅ "Payroll needs a way to mark a payslip paid and record the date + account it was credited to."
- ✅ "Let's build a proper notifications center for admins — birthdays, probation endings, payslip reminders." *(Tier 2 — Claude will offer to spec it.)*
- 🚫 You don't need to write user stories, acceptance criteria, or an FRD. Claude will ask what it needs.

Claude will: ask clarifying questions, propose an approach (and, for Tier 2, draft the plan), then
build. **It decides reversible details itself** (naming, structure, copy, defaults) and **only asks
you** when a choice is irreversible/costly, expands scope, conflicts with a prior decision, or needs a
secret.

---

## 5. What runs under the hood (so you can ask for it by name)

- **Skills** (`/feature-workflow`, `/qa-review`, `/db-change`, `/browser-verify`, `/find-skills`) —
  invocable workflows. You rarely call these directly; Claude uses them. But you *can*, e.g.
  "run a qa-review before we ship."
- **Review agents** (`security-reviewer`, `quality-reviewer`, `professional-qa`) — read-only
  reviewers Claude spawns at milestones. Ask for "a full QA pass" and it runs all three.
- **Hooks** — automatic guardrails: secret/credential writes are blocked; the RSC client-import
  pitfall is flagged. You don't invoke these; they just protect you.

---

## 6. The "done" gate (what shippable means here)

A change isn't done until:
1. `npx tsc --noEmit` clean + `npm run build` green,
2. `npm run report` → all suites PASS (unit + RLS + integration),
3. the affected screens verified in a real browser (Playwright screenshots Claude reads),
4. the KB updated in the same change.

Claude won't claim "done" on green tests alone — it actually exercises the feature.

---

## 7. Git & shipping

- Commits happen **per logical slice**, on `main`, under the repo identity `sabi-hawk`.
- **Push only when you ask** ("push it"). Claude never opens/merges PRs unless you ask.
- Secrets / `CREDENTIALS.md` are never committed (git-ignored + hook-blocked).
- Before staging, Claude checks the staged paths (we once leaked a folder via blind `git add -A` — it
  won't happen again).

---

## 8. A worked example (Tier 2, start to finish)

1. **You:** "We need an employee handbook page showing our current leave/probation/payroll policies,
   visible to everyone."
2. **Claude:** asks 2–3 questions (which policies, who can edit, static vs DB-backed?), then:
   *"This is a feature — shall I write it up as a plan?"*
3. **You:** "Yes."
4. **Claude:** creates `plans/upcoming/08-employee-handbook/plan.md` (what/why, the policy list,
   static page, nav entry, how to verify) and shows it to you.
5. **You:** "Looks good, build it."
6. **Claude:** moves it to `plans/inprogress/`, adds `tasks.md`, implements the page + nav, runs the
   gate, screenshots it, updates `knowledgebase/` + the changelog, commits.
7. **Claude:** "Done and verified — here's the screenshot. Push?" → on your OK, pushes, moves the plan
   to `plans/done/`.

For a Tier 1 change, skip steps 2–5: you describe it, Claude does 6–7.

---

## 9. CLI vs extension

You can drive all of this from the VS Code extension, but the **terminal (Claude Code CLI)** is where
the guardrails are *enforced* — hooks, per-project permissions, and the custom agents/skills are CLI
features (see `ai-workflow-kit/WHY-TERMINAL.md`). Recommended once you switch:
- Run Claude from the **repo root** so it loads `CLAUDE.md` + `.claude/`.
- Keep one repo per session for clean context.
- Let the hooks do the nagging; let the review agents check before you push.

---

## 10. Cheat sheet

| You want to… | Say… |
|---|---|
| Make a small change | just describe it |
| Spec something bigger first | "write this up as a plan" |
| Start building a planned feature | "move it to in-progress and build it" |
| Get a quality/security/QA pass | "run a full QA pass before we ship" |
| Check a UI actually works | "browser-verify the X screen" |
| Ship it | "push it" |
| Know the current state | "what's the status?" / check `.claude/PROGRESS.md` + `plans/` |
