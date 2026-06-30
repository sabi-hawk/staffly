# FRD-00 — CRM Vision & Module Map

| | |
|---|---|
| **Status** | Draft |
| **Module** | CRM (umbrella / index) |
| **Created** | 2026-06-30 |
| **Updated** | 2026-06-30 |
| **Plan** | — |
| **Changelog refs** | 2026-06-30 (CRM expansion kickoff) |

> The Softonoma portal is expanding from an internal HR/attendance/leave/payroll app into a **business
> CRM** — a single system to manage the company's business data (clients, deals, work, money, etc.).
> This is the umbrella FRD: it captures the overall vision and **maps the CRM into modules**, each of
> which gets its own FRD (`FRD-01+`). It matures as the owner supplies requirements.

---

## 1. Background & context
Today the portal serves HR/workforce needs (attendance, leave, payroll, employees, reports) — see
[`../00-product-overview.md`](../00-product-overview.md). The owner now wants the same system to also
run the **business side** of Softonoma as a CRM. This is a multi-module initiative, so we are using
the FRD process (see [`README.md`](README.md)) to consolidate and agree requirements per module
before building.

## 2. Goals & non-goals
- **Goals** — *(to be filled from the owner's requirements)*: manage Softonoma's business data;
  integrate sensibly with the existing employee/role/permission model; one coherent portal, not a
  bolt-on.
- **Non-goals** — *(TBD)*.

## 3. CRM module map
The CRM broken into candidate modules. **This is a placeholder list to be confirmed/replaced by the
owner's actual requirements** — do not treat as agreed scope yet. Each confirmed module becomes an FRD.

| # | Candidate module | FRD | Status |
|---|------------------|-----|--------|
| — | *(awaiting the owner's first requirements batch)* | — | — |

> Typical CRM modules (for reference while scoping — owner decides what's in): contacts/clients,
> companies/accounts, leads & sales pipeline (deals/stages), activities & tasks, quotes/proposals,
> invoicing & payments, projects/delivery, products/services catalog, reporting dashboards. The owner
> will tell us which apply to Softonoma and how they should work.

## 4. Cross-cutting considerations (apply to every CRM module)
- **Roles & permissions** — how CRM access maps onto Employee / Admin-HR / Super Admin (and whether
  new roles like sales/account-manager are needed). Defense in depth: middleware + RLS + UI.
- **Data privacy** — financial/sensitive CRM data scoped appropriately (mirror the payroll/PII rules).
- **Architecture reuse** — Next.js 14 + Supabase + RLS; logic in `lib/services/**`; new tables ship
  with RLS in the same migration; follow [`../01-architecture-and-conventions.md`](../01-architecture-and-conventions.md).
- **Audit** — CRM mutations should be auditable consistent with the existing audit-logging approach.

## 12. Open questions
- [ ] What does "CRM for our business" cover first — which module is highest priority?
- [ ] Who are the CRM users (same employees, or a different set / new roles)?
- [ ] How does CRM data relate to existing employees (e.g. deal owner = an employee)?
- [ ] Any external systems to integrate or import existing business data from?

---

## Change Log
- 2026-06-30 — created at CRM-expansion kickoff; module map to be populated from owner requirements.
