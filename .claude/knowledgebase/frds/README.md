# FRDs — Functional Requirements Documents

This folder is where **incremental instructions mature into agreed specs** before they become plans.
It exists for the **CRM expansion** (and any future large initiative): the portal is growing from an
HR/attendance/payroll app into a business CRM, which is many modules — each one gets an FRD.

> **Why FRDs now?** The base portal was built lightweight (describe-it-in-chat → build). The CRM is
> big and multi-module, so the owner wants requirements **consolidated and agreed per module** before
> any code. An FRD is that consolidated, agreed statement of *what a module must do* — captured so it
> is never lost and a fresh session can pick it up with full context.

---

## Where an FRD sits in the workflow

```
 INSTRUCTIONS (owner, in chat — any form: bullets, paragraphs, FRD doc, screenshots)
      │  logged dated, verbatim-ish →
      ▼
 ../06-requirements-changelog.md        raw capture, never lost
      │  consolidated by module →
      ▼
 frds/FRD-NN-<module>.md                the agreed spec  ← YOU ARE HERE
      │  status: Draft → In Review → Approved
      │  owner approves →
      ▼
 ../../plans/upcoming/NN-<module>/plan.md   technical approach + acceptance
      │  "build it" →
      ▼
 ../../plans/inprogress/  (+tasks.md)  →  ../../plans/done/
      │  on ship →
      ▼
 ../<module>.md  (durable "how it works")   + ../../database/database.md
```

The FRD is the bridge between **raw instructions** and a **plan**. The changelog says *"the owner
asked for X on date Y."* The FRD says *"here is the full, agreed definition of module X."* The plan
says *"here is how we'll build it."*

## Lifecycle — status is a field in the FRD header (the file does NOT move)

| Status | Meaning |
|--------|---------|
| **Draft** | Being filled from incoming instructions. Open questions outstanding. Expect churn. |
| **In Review** | Requirements captured; owner + Claude resolving the open-questions list. |
| **Approved** | Owner has signed off. Frozen enough to plan against. |
| **Promoted** | A plan now exists (`plans/upcoming/…` or further). FRD is the requirements-of-record; further requirement *changes* get a new dated entry in its Change Log section, never a silent rewrite. |

Unlike plans (whose folder = status), an FRD stays in `frds/` permanently as the requirements record.

## How to create / update an FRD

- Copy [`_TEMPLATE.md`](_TEMPLATE.md) → `FRD-NN-<short-module-name>.md` (next free number; `FRD-00`
  is the CRM vision/index).
- Fill what's known; everything unresolved goes in **§12 Open Questions** — that list drives the
  discussion.
- When a new instruction arrives for an existing module, log it to the changelog **and** fold it into
  that module's FRD (add a dated line to the FRD's **Change Log** if it changes agreed scope).
- Keep it factual and concise. No secrets, no real PII (use synthetic examples).

## Index of FRDs

| # | Module | Status | Plan |
|---|--------|--------|------|
| [00](FRD-00-crm-vision.md) | CRM Vision & Module Map | Draft | — |

> Keep this table current whenever an FRD is added or changes status.
