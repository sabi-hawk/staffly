# AI Workflow Kit

A portable, **stack-agnostic** starter for giving any project a robust Claude/AI development
workflow — the same `.claude/` structure (rules, skills, agents, hooks, a knowledge base, a database
index, and a lightweight plan lifecycle) that we use on the Softonoma Employee Portal.

It is **inspiration, not a cage.** Nothing here is mandatory. The target project's AI should *adapt*
these templates to that project's real stack, conventions, and how its owner actually works — and
drop anything that doesn't fit.

## What's inside
```
ai-workflow-kit/
├── README.md          ← you are here
├── INSTALL.md         ← give THIS to the target project's Claude; it bootstraps everything
├── WHY-TERMINAL.md    ← why running Claude in the terminal unlocks this workflow
├── templates/DEVELOPER-GUIDE.md.template  ← the human's operating manual (train developers with this)
└── templates/         ← generic templates (placeholders like {{PROJECT_NAME}}, {{TEST_CMD}})
    ├── CLAUDE.md.template
    ├── settings.json.template
    ├── hooks/                (block-secret-writes.mjs — ready to use as-is)
    ├── rules/                (security · testing · conventions · git)
    ├── agents/               (context-gatherer · security-reviewer · quality-reviewer · professional-qa)
    ├── skills/               (feature-workflow · db-change · browser-verify · find-skills)
    ├── knowledgebase/        (README.template — one folder/doc per module)
    ├── database/             (database.md.template — schema index)
    └── plans/                (README — optional lightweight plan lifecycle)
```

## How to use it (two minutes)
1. Copy this `ai-workflow-kit/` folder into the target repo (or keep it nearby).
2. In that repo, run Claude **in the terminal** (see `WHY-TERMINAL.md`) and say:

   > **"Read `ai-workflow-kit/INSTALL.md` and set up the workflow for this project."**

3. Claude will explore the codebase, ask a few questions, and generate a tailored `.claude/` +
   `CLAUDE.md` — filling the knowledge base from what's actually in the repo.

That's it. The result is a project that any future Claude session can pick up with full context.

## The core ideas (why this works)
- **Knowledge base = single source of truth.** Durable product/architecture/business knowledge lives
  in `.claude/knowledgebase/` + `.claude/database/`, updated in the *same change* as the code — so
  context is never lost between sessions.
- **A repeatable loop** (the `feature-workflow` skill): capture → ground in the KB → decide →
  implement small slices → self-test → review with subagents → verify in a browser → sync the KB → commit.
- **Guardrails as code**: hooks block secret writes; rules encode the non-negotiables; review agents
  catch regressions before commit.
- **Lightweight by default.** No FRDs/tickets required — requirements come from the owner in chat.
  Add the optional plan lifecycle only for multi-step initiatives.
