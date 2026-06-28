# Why run Claude in the terminal (Claude Code CLI)

You mentioned moving to Claude **in the terminal**. That's the right call for this workflow — the
`.claude/` stack (hooks, agents, skills, settings) is a first-class part of the Claude Code CLI.
Here's what the terminal unlocks, and what genuinely *requires* it.

## What only the terminal/CLI gives you
- **Hooks** — `.claude/settings.json` `PreToolUse`/`PostToolUse` hooks (e.g. `block-secret-writes.mjs`)
  run on every edit. This deterministic guardrail is a CLI feature; a chat-only web session can't
  enforce it.
- **Project `settings.json` permissions** — the `allow`/`deny` lists (auto-approve safe commands,
  block reading secrets) are honored by the CLI.
- **Custom subagents** — `.claude/agents/*.md` (context-gatherer, reviewers) become real `Task`
  subagents you can spawn in parallel, each with its own tools/model.
- **Project skills & slash commands** — `.claude/skills/*/SKILL.md` load as invocable workflows
  (`/feature-workflow`, `/qa-review`, …) plus built-ins like `/code-review`, `/security-review`.
- **Full repo + shell access** — run the dev server, migrations, test suites, git, Playwright; read
  build/test output and screenshots and act on them. The whole "implement → test → verify → commit"
  loop happens in one place.
- **Scriptable & headless** — drive Claude from scripts/CI, pipe input/output, integrate with other
  tools. Sessions are local to the repo and resumable.
- **MCP servers** — connect external tools (DBs, issue trackers, browsers) via MCP, configured per
  project.

## What you keep either way
Reading/writing files, running commands, and the knowledge base all work in any Claude surface — but
the **automation and guardrails** above (hooks, per-project permissions, project agents/skills) are
where the terminal pays off, because they make the workflow *enforced and repeatable* instead of
something you have to remember to do.

## Practical tips for terminal use
- Run Claude from the **repo root** so it picks up `CLAUDE.md` + `.claude/`.
- Keep the gate one command (a `report`/`test` script) so "is it green?" is trivial.
- Let hooks do the nagging (secrets, formatting, lint) so you don't have to.
- Commit per slice; push when you decide. Use subagents for review before you commit.
- One repo per terminal session keeps context clean; use git worktrees if you want parallel tasks.

> Bottom line: the terminal is what turns this from "a folder of nice docs" into an **enforced,
> repeatable development system**.
