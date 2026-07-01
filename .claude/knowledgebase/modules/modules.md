# Modules — durable knowledge (current truth)

One folder/doc per **business module**: how it works now, the rules/checks that must hold, its data
model, and key flows — everything an agent needs to build or extend it **without re-deriving context**.

> **This is the living knowledge base.** FRDs (`../frds/`) are the *agreed requirements* per feature;
> **module docs here are the durable "how it works"**. When a plan ships, its lasting knowledge is folded
> into the relevant module doc + `../../database/database.md`. The FRD stays as the requirements-of-record.
> Origin/provenance docs (v1 product overview, architecture, v1 business rules, source) live in `../reference/`.

## How to use
- **Building/extending a module?** Read its doc here first, then its FRD (for the agreed scope) and
  `../../database/database.md` (for schema). Update this doc in the **same change** as the code.
- Keep docs **descriptive of current truth**; put change/delivery detail in `../../plans/`.

## Index

### CRM (business — staffing/services) — see [`crm/crm.md`](crm/crm.md)
| Module | Doc | FRD | Status |
|--------|-----|-----|--------|
| CRM overview & business model | [crm/crm.md](crm/crm.md) | [FRD-00](../frds/FRD-00-crm-vision.md) | design agreed; pre-build |
| Profiles & Resumes | [crm/profiles.md](crm/profiles.md) | [FRD-01](../frds/FRD-01-profiles.md) | design agreed (Plan 01) |
| Roles / Departments / Access | [crm/access.md](crm/access.md) | [FRD-05](../frds/FRD-05-roles-access.md) | design agreed (Plan 01) |
| Interviews | [crm/interviews.md](crm/interviews.md) | [FRD-02](../frds/FRD-02-interviews.md) | design agreed (Plan 02) |
| Assessments | [crm/assessments.md](crm/assessments.md) | [FRD-03](../frds/FRD-03-assessments.md) | design agreed (Plan 02) |
| Leads & Deals | [crm/leads-deals.md](crm/leads-deals.md) | [FRD-04](../frds/FRD-04-leads-deals.md) | design agreed (Plan 02/03) |
| Activity Log & Audit | [crm/activity-log.md](crm/activity-log.md) | [FRD-06](../frds/FRD-06-activity-log.md) | design agreed (Plan 04) |

### HR (existing portal) — *to be backfilled from the code over time*
Attendance · Leave · Payroll · Employees · Reports · Settings/Holidays · Announcements · Handbook.
Until backfilled, the v1 descriptions live in [`../reference/`](../reference/) (product overview,
business rules) and `../../database/database.md`.

> **Note:** "Status" above = design maturity, not build status (build status lives in `../../plans/`).
> These CRM docs are **pre-drafted from the agreed FRDs** before development, so the product model is
> documented up front; they become live current-truth as each plan ships.
