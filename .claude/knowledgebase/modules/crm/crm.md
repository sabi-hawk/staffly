# CRM — business model & product knowledge

The portal's business side: Softonoma is a software **staffing / services** company. This doc is the
durable anchor for the CRM — the model, the module map, and the cross-cutting rules every CRM module
shares. Requirements-of-record: [FRD-00](../../frds/FRD-00-crm-vision.md) + FRD-01–06.

## The business in one screen
- We maintain marketable **developer profiles** — one real developer can be behind **many** profiles,
  one per stack (FS/BE/FE/SEO/DE/WordPress/AI-ML/MERN…). A profile is a **marketing identity**, not a
  person record.
- **Business Developers (BDs / VDs)** are each assigned ~2 (max 3) profiles and **apply on the profiles'
  behalf** to job posts (LinkedIn/Indeed/…).
- Responses become **interviews** and **assessments**, grouped under a **lead** (one job opportunity =
  company + role + profile). The **developer** who attends round 1 takes later rounds; the developer is
  assigned per interview/assessment row (can vary; is a portal user flagged `is_developer`).
- A lead that lands becomes a **deal** (engagement + financials + documents). A lead that turns out fake/
  low-pay/unpaid can be **disqualified** (excluded from BD stats).
- Everything was in Drive folders + Google Sheets; the CRM centralises it with proper access + audit.

## Modules
| Module | Doc |
|--------|-----|
| Profiles & Resumes | [profiles.md](profiles.md) |
| Roles / Departments / Access | [access.md](access.md) |
| Interviews | [interviews.md](interviews.md) |
| Assessments | [assessments.md](assessments.md) |
| Leads & Deals | [leads-deals.md](leads-deals.md) |
| Activity Log & Audit (platform-wide) | [activity-log.md](activity-log.md) |

## Cross-cutting rules (apply to every CRM module)
- **Naming:** the existing `profiles` table is the **auth/user** table (load-bearing). CRM developer
  profiles = **`dev_profiles`**. Never reuse `profiles` for CRM data.
- **Access (three layers — middleware + RLS + UI):**
  - **BD** (department = Business Development): sees/manages **their own** profiles/leads/interviews/
    assessments (owner-scoped); never profile passwords; never deals.
  - **BD Lead** (`is_bd_lead`): **view + manage all** BDs' CRM data + deals (senior editing a junior's
    work); an elevated tier between BD and admin.
  - **Admin / Super-admin:** full superset of BD abilities on **any** BD's data; deals are admin/
    super-admin only; profile passwords admin+super-admin only.
  - **Other employees:** no CRM access.
  - Founders (owner + brother) each hold a single admin/super-admin account, **also flagged
    `is_developer`** so they're assignable as the interview/assessment developer (no second account).
- **Departments:** a `departments` lookup + `profiles.department_id` FK (replaces free-text). RLS keys on
  it via `auth_is_bd()` / `auth_is_bd_lead()` security-definer helpers.
- **Storage:** sensitive CRM files (resumes, deal docs) live in a **private** `crm-docs` bucket; access
  via server-generated **signed URLs**; downloads are audit-logged.
- **Audit:** every CRM mutation is captured by the `record_audit()` trigger → surfaced in the Activity
  Log ([activity-log.md](activity-log.md)). Secrets/passwords never appear in audit payloads.
- **Placement/tech:** same Next.js app under `/crm/*`; logic in `lib/services/*` (injected Supabase
  client); new tables ship RLS in the same migration; follow `../../reference/01-architecture-and-conventions.md`
  + `../../../rules/conventions.md`.

## Known follow-ups (from the 2026-07-02 multi-agent CRM audit; 0 blockers)
Fixed in the audit pass: filters+search on all 5 list pages; same-developer-across-rounds default
(FRD-02); assessment-delete storage cleanup; FK `on delete set null` for activity person-refs; CRM
entities in the Logs filter; `dev_stacks` audited; minimal required-field validation. **Still deferred:**
- **CRM RLS cases in the `report` suite** (`scripts/rls-test.mjs`) — the E2E already proves owner-scoping
  + admin-only-deals + non-BD-block adversarially; adding DB-level RLS assertions to the gate is a follow-up.
- **BD performance analytics** (interviews/leads per BD; disqualified excluded) — a later analytics scope.
- **Storage RLS policies for `crm-docs`** — access is currently server-mediated (service-role upload +
  signed-URL download after an app-layer RLS check); documenting/adding bucket policies is a hardening follow-up.
- Minor UX: completion_date↔status coupling on assessments; richer per-record history (→ Plan 04 Activity Log).

## Delivery (see `../../../plans/`)
Plan 01 = Access + Profiles · Plan 02 = Leads + Interviews + Assessments · Plan 03 = Deals ·
Plan 04 = Activity Log. Build order: Profiles+access → activity → deals → audit UI.

## Key entities (map; full schema → `../../../database/database.md` once built)
`dev_profiles`, `dev_stacks`, `dev_profile_secrets`, `dev_profile_documents`, `interviews`,
`assessments`, `assessment_documents`, `leads`, `deals`, `deal_documents`, `receiving_accounts`,
`payment_methods`, `departments`; person flags `is_bd_lead` / `is_developer`; helpers `auth_is_bd()`,
`auth_is_bd_lead()`.
