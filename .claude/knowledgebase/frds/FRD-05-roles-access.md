# FRD-05 — Roles, Departments & CRM Access

| | |
|---|---|
| **Status** | Promoted |
| **Module** | CRM · Access foundation (cross-cutting) |
| **Created** | 2026-06-30 |
| **Updated** | 2026-07-01 |
| **Plan** | [plans/done/01-crm-profiles-foundation](../../plans/done/01-crm-profiles-foundation/plan.md) |
| **Changelog refs** | 2026-06-30 (CRM business model + first batch) |

> The access foundation the whole CRM sits on: only **Business-Development (BD)** employees see the CRM,
> **admin/super-admin** see everything, **other employees** see nothing, and **Deals** are admin/super-
> admin only. This FRD defines the department/role gating across the three layers (middleware + RLS + UI).
> It is a **dependency of FRD-01–04** and should be built alongside FRD-01's first slice.

---

## 1. Background & context
Today roles are `employee | admin | super_admin` on `profiles.role`; `auth_role()` powers all RLS;
middleware only blocks employees from `/admin/*`. Department is a **free-text** `profiles.department`
(BDs = `'Business Development'`); it drives nothing today except one UI conditional. There is **no**
CRM route gate, no department-aware nav, and no BD-scoped RLS helper — all new here.

## 2. Goals & non-goals
**Goals:** a reliable, three-layer gate so the right people see the right CRM data.
**Non-goals:** redesigning the existing HR role model; per-record sharing beyond owner-based BD scoping.

## 3. Users & roles (CRM access matrix)
| Area | BD employee | **BD Lead** | Admin | Super-admin | Other employee |
|------|------------|-------------|-------|-------------|----------------|
| Profiles (own / assigned) | view (no password) | **all BDs'** | all | all | — |
| Profile password | — | — | view | view | — |
| Interviews / Assessments (own) | view + manage | **all BDs' (view + manage)** | all | all | — |
| Deals | — | **view all (scope TBD Q6)** | all | all | — |
| BD performance analytics | own only | **all BDs'** | all | all | — |

**BD Lead** = a BD-department employee the owner promotes (flag `is_bd_lead`); there can be several. They
see across **all** BDs (leads/interviews/assessments/profiles + deals). Exact manage/financial scope: Q5/Q6.
The **founders (owner + brother)** hold a single admin/super-admin account each and are **also selectable as
developers** on interviews/assessments (see FR-7) — no separate employee account needed.

## 4. Functional requirements
- **FR-1** Introduce a canonical **"is BD"** signal and a CRM access predicate: `admin/super-admin OR
  (employee AND department_id = <Business Development>)` via the new `departments` lookup + FK.
- **FR-2** **Middleware**: gate the CRM path(s) (e.g. `/crm/*`) — non-BD, non-admin users redirected.
  Deals path(s) restricted to admin/super-admin. Extend the existing select to include `department`.
- **FR-3** **RLS helper**: add a SQL helper (e.g. `auth_is_bd()` security-definer) so CRM table policies
  can express BD-or-admin access without repeating the join. Used by FRD-01–04 policies.
- **FR-4** **Nav**: extend `navForRole(role)` → `navForRole(role, department)` so CRM nav items show for
  BDs (and admins) but not other employees. `Profile.department` is already passed to `AppShell`.
- **FR-5** **Owner-scoped reads**: BD-facing CRM tables expose only rows where the BD is the owner
  (`owner_bd_id = auth.uid()`), enforced by RLS (defense in depth with UI).
- **FR-6** **Admin/super-admin are a full superset of BD abilities.** Anything a BD can do (create/edit
  profiles' interviews, assessments, leads; disqualify a lead; enter completion; assign owners; etc.),
  admin/super-admin can also do — on **any** BD's data, not just their own. RLS policies grant
  admin/super-admin unrestricted CRUD on every CRM table (deals remain admin/super-admin-*only*).
- **FR-7** **Developer picker is not department-restricted.** The developer assigned on interviews/
  assessments (`given_by` / `whom_should_give` / `completed_by`) can be **any active portal user flagged
  as a developer** — Engineering employees **and** the founder admin/super-admin accounts — so the founders
  can be assigned as developers without a second account. (Modelled via an `is_developer` flag on the
  person; picker lists flagged users. Finalise in the plan.)
- **FR-8** **BD Lead tier.** A per-employee `is_bd_lead` flag (BD-department only) grants **read AND
  manage across all BDs'** CRM data (leads/interviews/assessments/profiles) **and deals** — an elevated
  tier between BD and admin; a senior BD can edit a junior's work on their behalf. New RLS helper
  `auth_is_bd_lead()`. All edits audited ([FRD-06](FRD-06-activity-log.md)). Deal-financial scope: Q6.

## 5. Data model (high level)
- **`departments` lookup table** (resolved Q2): id, name, sort_order, active. `profiles.department_id`
  → `departments.id` (migrate the existing free-text `department` values into it; "Business Development"
  is the BD row). Typo-proof, reusable, and what RLS now keys on.
- **Person flags on `profiles`** (or a companion table): `is_bd_lead` (elevated BD; see FR-8) and
  `is_developer` (selectable as an interview/assessment developer; see FR-7). Both boolean, admin-set.
- New **SQL function(s)**, security-definer like `auth_role()`: `auth_is_bd()` (BD-or-admin) and
  `auth_is_bd_lead()` (elevated cross-BD visibility). Possibly `auth_department()`.

## 6. Permissions & security
- Three layers, never UI-only. The DB (`auth_is_bd()` + policies) is the source of truth.
- Free-text department is a risk (typos/casing) — see Q2; if kept, lock the exact value `'Business
  Development'` by convention and normalise on write.

## 7. Screens & UX
- A new **CRM** nav group (Profiles, Interviews, Assessments, My Profiles, Deals[admin]).
- Non-BD employees never see the group; deep-linking is blocked by middleware + RLS.

## 8. Business rules
- "Moon"/CEO appears as a profile owner — decide whether CEO counts as BD or admin for CRM visibility (Q3).
- Deactivated employees already blocked at middleware; CRM inherits this.

## 9. Integrations & dependencies
- Consumed by **all** CRM FRDs. Touches `lib/supabase/middleware.ts`, `lib/nav.ts`, `lib/types.ts`,
  `components/layout/app-shell.tsx`, and a new CRM migration (the `auth_is_bd()` helper).

## 10. Acceptance criteria
- [ ] A BD sees the CRM nav + only their own profiles/interviews/assessments; never Deals; never passwords.
- [ ] An Engineering/Design/QA employee sees no CRM nav and is redirected from any `/crm` URL.
- [ ] Admin/super-admin see all CRM data; only they (and BD Leads per Q6) see Deals.
- [ ] A **BD Lead** sees all BDs' leads/interviews/assessments/profiles (and deals per Q6); a plain BD does not.
- [ ] A founder's single admin/super-admin account can be assigned as the **developer** on an interview/assessment.
- [ ] RLS tests prove cross-BD reads and non-BD reads are blocked at the DB layer.

## 11. Reporting / analytics
- Provides the access scoping that BD-performance analytics (interviews per BD) builds on.

## 12. Open questions
- [x] **Q1** BD analytics visibility. **RESOLVED 2026-07-01 (default):** a BD sees their **own**
  performance numbers; admin/super-admin see all. (Detailed analytics is a later scope.)
- [x] **Q2** Department modelling. **RESOLVED 2026-06-30:** introduce a `departments` lookup table +
  `profiles.department_id` FK (migrate existing free-text values in). RLS keys on it.
- [x] **Q3** Moon's role. **RESOLVED 2026-07-01:** Moon is a **BD** — profile owners are always
  BD-department members. Moon must be set up in the BD department.
- [x] **Q4** CRM URL scheme. **RESOLVED 2026-07-01 (decided):** dedicated **`/crm/*`** prefix for the
  middleware gate; Deals under an admin-gated path.
- [x] **Q5** BD Lead powers. **RESOLVED 2026-07-01:** **view + manage** across all BDs — a BD Lead
  (senior) can edit/reassign/disqualify junior BDs' leads/interviews/assessments on their behalf. Every
  such change is audited (see [FRD-06](FRD-06-activity-log.md)).
- [ ] **Q6** BD Lead + Deals — do BD Leads see **full deal financials** (salary, receiving accounts) or a
  redacted view? (Deals are otherwise admin/super-admin only.)

## 13. Out of scope / future
- Granular per-record sharing / co-ownership; multiple BDs per profile.

---

## Change Log
- 2026-06-30 — created from the CRM kickoff batch + codebase recon; set to In Review.
- 2026-07-01 — Q1–Q4 resolved (BD sees own analytics; departments lookup; Moon = BD; `/crm/*` prefix) →
  **status = Approved**.
- 2026-07-01 — (post-promotion) added **FR-6**: admin/super-admin are a full superset of BD abilities on
  any BD's CRM data. Consistent with plan 01's RLS; primarily affects the later interviews/assessments/
  leads plans.
- 2026-07-01 — added **FR-7** (developer picker not department-restricted; founders selectable as
  developers via `is_developer`) and **FR-8** (**BD Lead** tier via `is_bd_lead` + `auth_is_bd_lead()`,
  cross-BD visibility incl. deals). New open questions Q5/Q6. **Plan 01 updated** to fold `is_bd_lead`/
  `is_developer` + `auth_is_bd_lead()` into the access foundation. Status stays Promoted; Q5/Q6 must be
  settled before the leads/deals plan.
