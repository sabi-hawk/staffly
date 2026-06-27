# Softonoma Employee Portal — Knowledge Base

This folder is the **single source of truth** for what we are building, why, and how. Every
agent (and human) working on this repo must read the relevant files here **before** writing
code, and must **update** them when requirements or architecture change.

> If `CLAUDE.md` is "how we work", the knowledge base is "what we're building". Keep them in sync.

## How to use this knowledge base

**At the start of any task**, read in this order:
1. [`00-product-overview.md`](00-product-overview.md) — what the product is, who uses it.
2. [`01-architecture-and-conventions.md`](01-architecture-and-conventions.md) — stack, folder
   structure, coding conventions, how data flows.
3. [`02-data-model.md`](02-data-model.md) — tables, columns, RLS, triggers, enums.
4. [`03-business-rules.md`](03-business-rules.md) — the rules that must never be violated
   (hours math, leave quotas, payroll, permissions).
5. [`04-v2-softonoma-overhaul.md`](04-v2-softonoma-overhaul.md) — the v2 feature set & status.
6. [`05-testing-and-validation.md`](05-testing-and-validation.md) — how we test & self-validate.
7. [`06-requirements-changelog.md`](06-requirements-changelog.md) — chronological log of every
   requirement the owner has given. **Append here whenever a new requirement arrives.**

`source/` holds original artifacts (the original Staffly PRD, brand source images).

## Rules for keeping it current (agents MUST follow)
- **New requirement from the owner?** Append a dated entry to
  [`06-requirements-changelog.md`](06-requirements-changelog.md) *first*, then implement.
- **Changed the schema?** Update [`02-data-model.md`](02-data-model.md) in the same change.
- **Changed a business rule / added a feature?** Update `03`/`04` in the same change.
- Keep entries concise and factual. Link between docs with relative paths.
- Never delete history from the changelog — supersede with a new entry instead.

## Quick facts
- Product: **Softonoma Employee Portal** (HR / attendance / leave / payroll).
- Stack: Next.js 14 (App Router, TS strict) · Supabase (Postgres 17 + Auth + RLS) ·
  Tailwind + shadcn-style UI.
- DB is a **cloud** Supabase project; migrations applied via `npm run db:migrate`.
- Logins after seed: super admin `founder@acme.test` / admin `hr@acme.test` (`Test@12345`);
  employees use their email + `Softonoma@123`.
