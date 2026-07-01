# CRM · Assessments

Per-BD assessment (take-home/technical test) tracking. Requirements: [FRD-03](../../frds/FRD-03-assessments.md).
Delivery: Plan 02. Schema: `../../../database/database.md`.

## What it is
Each row = one **assessment** for a job/company against a profile, under a **lead**. Replaces the per-BD
sheet "Assessments" tab. **Duration** is a first-class field (devs pick assessments by how long they take).

## Data model
- **`assessments`** — id, `dev_profile_id`, `lead_id`, `owner_bd_id`, job_title, company,
  **status** (pending|in-progress|completed|cancelled), entry_date, deadline, completion_date,
  mail_subject, job_post_url, job_description, **completed_by** (employee), priority (high|medium|low),
  budget (free text), assessment_link, **duration** (lookup: 15m/30m/45m/1h/1.5h/2h/2h+, extendable),
  notes, extra, timestamps.
- **`assessment_documents`** — resume_cv | extra; uploaded files in private `crm-docs` bucket
  (signed-URL, download-logged) — like profile resumes.

## Rules
- Completion date/`completed_by` filled by the **BD** (owner) or admin/super-admin — developers don't log
  in to self-enter. `completed_by` is a portal user flagged `is_developer`.
- Completion date set when status → completed. **Overdue** = deadline passed and not completed (surfaced/highlighted).
- Budget is free text (varied: "$55-60/hr", "N/A", "not mentioned").

## Permissions
BD: own. BD Lead: all BDs' (view+manage). Admin/super: all. Others: none. Audited.

## Screens
`CRM → Assessments`: grid with priority/status chips, overdue highlight, **duration filter**, deadline
range; upload resume/extra via the crm-doc route. BD own; BD-Lead/admin all.

## Relationships
Belongs to a [lead](leads-deals.md); references a [profile](profiles.md). Access → [access.md](access.md).

## As-built (Plan 02, 2026-07-01) — shipped
- Tables `assessments` + `assessment_documents` (migration `0013`), owner-scoped RLS. Duration is free
  text from a preset list; budget free text; `completed_by` = an `is_developer` employee. Docs in the
  private `crm-docs` bucket (`assessments/<id>/…`), signed-URL + audit-logged downloads.
- Managed on the **lead detail** (`lead-activity.tsx` + `assessment-form.tsx` + `assessment-docs.tsx`);
  flat grid `/crm/assessments` with **overdue** highlight (deadline < today Asia/Karachi & not completed).
