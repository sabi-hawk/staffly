# INSTALL — bootstrap this workflow into a project

**You are the AI assistant for the target project.** The owner has dropped in `ai-workflow-kit/` and
asked you to set up the workflow. Follow these steps. **Adapt, don't transcribe** — every template is
a starting point to tailor to *this* repo. When unsure, ask the owner a short, batched set of
questions rather than guessing on anything irreversible.

## Step 1 — Learn the project (don't write yet)
Explore the repo and infer:
- **Stack & package manager** (language, framework, DB, test runner, build tool; npm/pnpm/yarn/etc.).
- **Structure & conventions** (where logic vs UI vs routes live, naming, import aliases, formatting).
- **Data layer** (DB engine, schema/migrations location, auth/permission model, any RLS/row-security).
- **How it runs & tests** (dev command, test command(s), build, lint, type-check).
- **Git** (default branch, identity expectations, remote, branch/PR conventions).
- **Sensitive files** (`.env*`, keys, any credentials doc) that must never be committed.
Read existing docs (`README`, `CONTRIBUTING`, an existing `CLAUDE.md`) and any obvious domain modules.

## Step 2 — Confirm the few things you can't infer
Ask the owner, batched, only what matters:
- How do requirements arrive (chat / tickets / FRDs)? → sets how heavy the plan lifecycle should be.
  If the owner expects **large, multi-module initiatives**, keep `knowledgebase/frds/` (per-module
  specs that mature before becoming plans); if it's only small chat-sized changes, you can drop it.
- What's the gate for "done" (a test command, coverage %, manual check)?
- Git identity + whether to push / open PRs, and the default branch.
- Any hard rules (security/compliance, things that must never break).

## Step 3 — Generate `.claude/` (tailored from `templates/`)
Create the structure below, **filling placeholders** (`{{PROJECT_NAME}}`, `{{STACK}}`, `{{DEV_CMD}}`,
`{{TEST_CMD}}`, `{{BUILD_CMD}}`, `{{GATE}}`, `{{DB_ENGINE}}`, `{{GIT_IDENTITY}}`, …) with real values,
and **rewriting** the prose so it describes *this* project, not a generic one. Drop sections that
don't apply (e.g. no DB → skip `database/` + `db-change`; no browser UI → skip `browser-verify`).

```
.claude/
├── settings.json          ← from settings.json.template (hooks + allow/deny for this stack)
├── hooks/                 ← block-secret-writes.mjs (use as-is; add stack-specific guards if useful)
├── rules/                 ← security · testing · conventions · git (rewrite to this project's truth)
├── agents/                ← context-gatherer + the review agents (adapt tools/model + checklists)
├── skills/                ← feature-workflow (your core loop) + db-change / browser-verify / find-skills as relevant
├── knowledgebase/         ← README + ONE doc/folder per real module (fill from the codebase, Step 4)
│   └── frds/              ← per-module requirement specs for large initiatives (keep if multi-module work is expected; else drop)
├── database/database.md   ← schema index (skip if no DB)
└── plans/                 ← README + backlog/upcoming/inprogress/done (keep empty; optional)
```
Also create/refresh the root **`CLAUDE.md`** (from `CLAUDE.md.template`) as the map that points into
`.claude/`, and generate **`.claude/DEVELOPER-GUIDE.md`** (from `DEVELOPER-GUIDE.md.template`) — the
human's operating manual for the workflow. Add the secrets/credentials patterns to `.gitignore`.

## Step 4 — Seed the knowledge base from reality
This is the highest-value step. Populate `.claude/knowledgebase/` and `.claude/database/database.md`
by reading the actual code — product overview, architecture & conventions, the **business rules that
must never break**, the data model, and how to test. Cite real file paths. A knowledge base that
mirrors the repo is what lets future sessions start grounded instead of re-deriving everything.

## Step 5 — Wire up & verify
- Make sure the hook command paths in `settings.json` resolve (`node .claude/hooks/...`).
- Adjust the `permissions.allow` list to this project's real commands.
- Do a dry run of the gate (`{{TEST_CMD}}` / `{{BUILD_CMD}}`) so it's known-green.
- Summarize to the owner what you created and the few decisions you made.

## Principles (carry these into the generated workflow)
- **Lightweight first.** Match the owner's reality; don't impose ceremony they didn't ask for.
- **KB is the source of truth**, updated in the same change as the code.
- **Decide vs ask**: proceed on reversible details (note them); ask only on big/irreversible/conflicting calls.
- **Guardrails as code**: secret-blocking hook + encoded hard rules + a review pass before commit.
- **Verify for real**: don't claim done on green tests alone — exercise the actual feature.
