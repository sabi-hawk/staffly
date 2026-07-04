# Softonoma Portal — Knowledge Base

The **single source of truth** for what we're building, why, and how. Read the relevant parts **before**
writing code; **update** them in the same change as the code. (If `CLAUDE.md` is "how we work", this is
"what we're building".)

## Layout — three parts + the changelog

```
knowledgebase/
├── README.md                     ← this index
├── 06-requirements-changelog.md  ← dated log of every requirement (append FIRST, then build)
├── modules/    ← DURABLE living knowledge: how each module works now (the real KB)
│   ├── modules.md   (index)   and  crm/  (crm.md + one doc per CRM module)
├── frds/       ← requirements MATURATION per feature (Draft → In Review → Approved → Promoted)
│   └── README.md (the FRD process + index)
└── reference/  ← ORIGIN / provenance: where it started (read-once, not day-to-day)
    ├── 00-product-overview.md · 01-architecture-and-conventions.md · 03-business-rules.md (v1)
    ├── 04-v2-softonoma-overhaul.md · 05-testing-and-validation.md · 07-production-readiness.md
    ├── 08-access-and-accounts.md  ← roles/tiers, access matrix, owner+partner model, credential map
    └── source/  (original Staffly PRD, brand assets)
```

Sibling areas: **`../database/database.md`** (schema — kept current on every DB change) and
**`../plans/`** (delivery: `upcoming → inprogress → done`).

## How the three parts relate (the workflow)
1. **A requirement arrives** → append a dated line to `06-requirements-changelog.md`.
2. For a **large/multi-module initiative**, consolidate it into an **FRD** in `frds/` and mature it
   (Draft → Approved). Only an Approved FRD is **promoted to a plan** (`../plans/`).
3. When a plan ships, its durable "how it works" knowledge is **folded into `modules/`** (+ `database.md`).
   The FRD stays as the requirements-of-record; the module doc becomes **current truth**.
4. `reference/` holds the **origin** docs (v1 product overview, architecture, v1 rules, source) for
   provenance — they don't change day-to-day.

> **In short:** `frds/` = the agreed *what* (per feature) · `modules/` = the durable *how it works* (per
> module) · `reference/` = *where it started* · `06-…changelog` = *the running record of asks*.

## Read order for a task
1. The relevant **`modules/<module>`** doc (current truth) — or its **`frds/`** FRD if it's still pre-build.
2. **`../database/database.md`** (schema).
3. **`reference/03-business-rules.md`** for the v1 non-negotiables; module docs for their own rules.
4. **`06-requirements-changelog.md`** for recent asks.

## Rules for keeping it current
- **New requirement?** Append to `06-requirements-changelog.md` *first*, then implement.
- **Large/multi-module?** Fold it into its FRD in `frds/`; mature before promoting to a plan.
- **Shipped a change?** Update the `modules/<module>` doc + `../database/database.md` in the same change.
- Concise + factual; cite real file paths; link between docs with relative paths.
- No secrets, no PII. Never delete changelog history — supersede with a new entry.

## Quick facts
- Product: **Softonoma Portal** — HR (attendance/leave/payroll) **+ a business CRM** (staffing/services:
  profiles, interviews, assessments, leads/deals). See [`modules/crm/crm.md`](modules/crm/crm.md).
- Stack: Next.js 14 (App Router, TS strict) · Supabase (Postgres 17 + Auth + RLS) · Tailwind/shadcn UI.
- DB is a **cloud** Supabase project; migrations via `npm run db:migrate`.
