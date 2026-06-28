---
name: find-skills
description: Discover and (optionally) install agent skills from the open ecosystem when the owner asks "is there a skill for X", "how do I do X", or wants to extend capabilities. Vet quality before recommending.
---

# Find Skills

The Skills CLI (`npx skills`) is the package manager for the open agent-skills ecosystem; browse at
https://skills.sh/.

## Commands
- `npx skills find [query]` — search (e.g. `npx skills find react performance`).
- `npx skills add <owner/repo@skill> -g -y` — install (global, no prompt).
- `npx skills check` / `npx skills update` — updates.

## How to help
1. Identify the domain + task; check the **leaderboard** first for a battle-tested option.
2. Search if needed. **Vet before recommending**: prefer 1K+ installs and reputable sources
   (`vercel-labs`, `anthropics`, `microsoft`); be skeptical of <100 installs or low-star repos.
3. Present: name, what it does, install count/source, the install command, a skills.sh link.
4. Offer to install if the owner wants it.

## Useful for this stack (vet the source first)
- **Vercel** `vercel-labs/agent-skills` — Next.js (App Router/RSC), React performance, design/a11y.
- **Anthropic** `anthropics/skills` — frontend design, document processing.
- **Trail of Bits** security skills (`/plugin marketplace add trailofbits/skills`).
- Built-ins need no install: **/code-review**, **/security-review**.

If nothing fits, do the task directly; suggest `npx skills init <name>` if it's a recurring need.
