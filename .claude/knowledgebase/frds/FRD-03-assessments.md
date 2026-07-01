# FRD-03 — Assessments

| | |
|---|---|
| **Status** | Promoted |
| **Module** | CRM · Assessments |
| **Created** | 2026-06-30 |
| **Updated** | 2026-07-01 |
| **Plan** | [plans/done/02-crm-activity](../../plans/done/02-crm-activity/plan.md) |
| **Changelog refs** | 2026-06-30 (CRM business model + first batch) |

> Track take-home/technical assessments a BD secures while applying on a profile's behalf. Replaces the
> per-BD monthly sheet "Assessments" tab (screenshots `image copy 6` + `image copy 7`). Each row = one
> assessment for a job/company against a profile.

---

## 1. Background & context
Today: an "Assessments" tab in each BD's monthly sheet. Columns observed: Profile, Lead Owner (BD), Job
Title, Company, Status, Entry Date, Deadline, Completion Date (filled by the developer), Mail Subject,
Job Post URL, Job Description, Completed By (developer), Priority, Budget, Assessment Link, Notes,
Resume/CV, Extra. The owner flagged a **Duration** column as important but **missing** today.

## 2. Goals & non-goals
**Goals:** centralised assessment log per BD, owner-scoped; capture duration; deadline/priority
visibility. **Non-goals:** interviews ([FRD-02](FRD-02-interviews.md)); deals ([FRD-04](FRD-04-leads-deals.md)).

## 3. Users & roles
- **BD**: create/edit/view assessments for assigned profiles. The **developer** fills the completion date
  + completed-by (Q3).
- **Admin/super-admin**: view all, analytics. Others: no access ([FRD-05](FRD-05-roles-access.md)).

## 4. Functional requirements (from the sheet)
- **FR-1** Assessment fields: **profile** (FK), **lead owner** (BD), **job title**, **company**,
  **status** (pending / in-progress / completed), **entry date**, **deadline**, **completion date**,
  **mail subject**, **job post URL**, **job description**, **completed by** (developer/employee),
  **priority** (high/medium/low), **budget**, **assessment link**, **notes**, **resume/CV** (link/doc),
  **extra**, and **NEW: duration** (e.g. 15m / 30m / 1h / 1.5h — devs pick by duration).
- **FR-2** Grid per BD: paginated, filterable (status, priority, deadline range, duration), searchable;
  empty state; existing table/pagination pattern. Surface overdue (deadline passed, not completed).
- **FR-3** Link to the same **lead** as its interviews (Q from FRD-02 Q2).
- **FR-4** Mutations audited.

## 5. Data model (high level)
| Entity | Key fields | Notes |
|--------|-----------|-------|
| `assessments` | id, dev_profile_id, owner_bd_id, lead_id, job_title, company, status, entry_date, deadline, completion_date, mail_subject, job_post_url, job_description, completed_by (employee), priority, budget (text), assessment_link, duration, notes, extra, created_at, updated_at | FKs → `dev_profiles`, `leads`, `profiles`. RLS: BD own, admin/super all, BD-Lead all BDs'. |
| `assessment_documents` | id, assessment_id, doc_type (resume_cv \| extra), label, file_path, uploaded_by, created_at | Uploaded files in private `crm-docs` bucket; signed-URL + download-logged. |

## 6. Permissions & security
Owner-scoped RLS (FRD-05 helper); admin/super-admin full. Assessment links/resume docs handled per the
private-storage approach where they're uploaded files (vs external URLs).

## 7. Screens & UX
- **CRM → Assessments** (BD own; admin all). Priority + status as coloured chips; overdue highlight;
  duration as a select. Back link, toasts.

## 8. Business rules
- Completion date set when status → completed (by the developer, Q3).
- Duration is a controlled set (15m/30m/45m/1h/1.5h/2h/other) — confirm (Q2).

## 9. Integrations & dependencies
- Depends on [FRD-01](FRD-01-profiles.md) + [FRD-05](FRD-05-roles-access.md); shares lead concept with [FRD-02](FRD-02-interviews.md)/[FRD-04](FRD-04-leads-deals.md).

## 10. Acceptance criteria
- [ ] A BD logs an assessment (incl. duration) against an assigned profile; sees only their own.
- [ ] Deadline/overdue and priority are visible and filterable.
- [ ] Admin views all; filters by BD/profile/status/priority/duration.

## 12. Open questions
- [x] **Q1** Budget format. **RESOLVED 2026-07-01 (default):** **free text** (handles "$55-60/hr",
  "N/A", "not mentioned"). Revisit structured amounts later if you want budget analytics.
- [x] **Q2** Duration set. **RESOLVED 2026-07-01:** preset selectable list **15m / 30m / 45m / 1h / 1.5h /
  2h / 2h+** (filterable). Kept as an extendable lookup so you can add values later.
- [x] **Q3** Who fills completion. **RESOLVED 2026-07-01:** the **BD** (lead owner) enters completion date
  + completed-by, and **admin/super-admin can too** (they can do everything a BD can). Developers do **not**
  log in to self-enter — they're selected from employees (FRD-02 Q4) as a reference. No developer CRM login needed.
- [x] **Q4** Resume/CV + Extra. **RESOLVED 2026-07-01:** **uploaded files** into the private `crm-docs`
  bucket (signed-URL download, download-logged per [FRD-06](FRD-06-activity-log.md)) — like profile resumes.
- [x] **Q5** Status set. **RESOLVED 2026-07-01 (default):** Pending / In-progress / Completed / Cancelled.
  Override anytime.

## 13. Out of scope / future
- Deadline reminder notifications; auto-status from completion date.

---

## Change Log
- 2026-06-30 — created (Draft skeleton); columns captured from the sheet; flagged the new Duration field.
- 2026-07-01 — Q1–Q5 resolved (budget free-text; duration preset; BD/admin enters completion; resume/extra
  uploaded; status set) → **status = Approved**.
