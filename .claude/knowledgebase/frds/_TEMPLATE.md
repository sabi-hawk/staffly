# FRD-NN — <Module name>

| | |
|---|---|
| **Status** | Draft · In Review · Approved · Promoted *(keep one)* |
| **Module** | <e.g. Clients / Sales pipeline / Invoicing> |
| **Created** | YYYY-MM-DD |
| **Updated** | YYYY-MM-DD |
| **Plan** | — *(link to `plans/…/plan.md` once promoted)* |
| **Changelog refs** | <dates of the related entries in ../06-requirements-changelog.md> |

> One-paragraph summary: what this module is and the problem it solves, in plain language.

---

## 1. Background & context
Why this module now; what exists today it relates to (existing portal modules, other CRM modules);
any constraints from the current architecture.

## 2. Goals & non-goals
- **Goals** — the outcomes this module must achieve.
- **Non-goals** — explicitly out of scope (so scope doesn't creep). See also §13.

## 3. Users & roles
Who uses it and what each can do. Existing roles are Employee / Admin-HR / Super Admin — note if the
CRM introduces new roles or role-scoped access (e.g. sales rep, account manager).

## 4. Functional requirements
The core of the FRD. Numbered so we can reference them.
- **FR-1** — …
- **FR-2** — …

## 5. Data model (high level)
Entities, key fields, and relationships. Enough to plan a schema later (the real DDL + RLS comes in
the `db-change` skill / plan). Note links to existing tables (e.g. `profiles`, `employees`).

| Entity | Key fields | Relationships |
|--------|-----------|---------------|
| … | … | … |

## 6. Permissions & security
Who can read/write what. RLS expectations. Any sensitive data (PII, financial) and where it must
live. (Recall: compensation/financial = super_admin only; PII in a private table.)

## 7. Screens & UX
The screens/flows this needs (list + one line each). Key user journeys. Reuse existing UI primitives
and patterns (pagination, empty states, toasts, back links).

## 8. Business rules
Rules that must always hold (validation, calculations, state transitions). Be explicit — these become
tests.

## 9. Integrations & dependencies
Other CRM modules or portal features this depends on or feeds; any external services.

## 10. Acceptance criteria
Concrete, checkable statements of "done" for this module. These guide the plan's verification.
- [ ] …

## 11. Reporting / analytics (if any)
What needs to be summarized, exported, or surfaced on a dashboard.

## 12. Open questions
The discussion list — every unresolved decision. Resolve these to move Draft → In Review → Approved.
- [ ] …

## 13. Out of scope / future
Deliberately deferred — captured so it isn't forgotten.

---

## Change Log
Dated entries when agreed scope changes after first draft (never silently rewrite requirements).
- YYYY-MM-DD — created.
