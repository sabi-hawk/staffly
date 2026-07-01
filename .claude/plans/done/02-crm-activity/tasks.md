# Tasks — Plan 02: CRM Activity (Leads + Interviews + Assessments)

Builds on Plan 01 (access foundation, dev_profiles, auth_is_bd/auth_is_bd_lead, crm-docs bucket).
Owner-scoped writes: a BD manages their OWN leads/interviews/assessments; BD-Lead + admin manage all.
Developer refs (given_by/whom_should_give/completed_by) = employees flagged `is_developer`.

## Slice A — Leads (FRD-04 leads part)
- [ ] `0013` (leads table): company, role, dev_profile_id, owner_bd_id, status
  (open|interviewing|assessment|won|lost|disqualified), disqualified_category/note/by/at. RLS
  (BD own · BD-Lead/admin all) + audit + updated_at.
- [ ] `lib/services/crm-leads.ts`; routes `/api/crm/leads` (POST), `/api/crm/leads/[id]` (PATCH incl. disqualify/requalify).
- [ ] UI: `/crm/leads` (pipeline list by status + create), `/crm/leads/[id]` (detail + disqualify + nested interviews/assessments).

## Slice B — Interviews (FRD-02)
- [ ] `interviews` table: lead_id, dev_profile_id, owner_bd_id, job_title, company, job_post_url,
  status (scheduled|completed|cancelled|pending), given_by, whom_should_give (employees), interview_at,
  notes, notes2, round (1st|2nd|3rd|final), outcome (pending|selected|rejected|on_hold). RLS + audit + updated_at.
- [ ] service + routes (`/api/crm/interviews`, `/api/crm/interviews/[id]`).
- [ ] UI: add/edit on lead detail; flat `/crm/interviews` grid (own; admin/BD-Lead all).

## Slice C — Assessments (FRD-03)
- [ ] `assessments` table (+ `assessment_documents` in crm-docs): status (pending|in_progress|completed|
  cancelled), entry_date, deadline, completion_date, mail_subject, job_post_url, job_description,
  completed_by, priority (high|medium|low), budget (text), assessment_link, duration (15m…2h+), notes, extra.
- [ ] service + routes + doc upload/download (reuse crm-docs pattern).
- [ ] UI: add/edit on lead detail; flat `/crm/assessments` grid (overdue highlight, duration filter).

## Cross
- [ ] nav: add CRM Leads / Interviews / Assessments for BD + admin.
- [ ] `seed-crm.mjs`: flag a few `is_developer` employees + demo leads/interviews/assessments.

## Progress
- [x] Slice A — Leads: `0013` leads table + RLS (owner-scoped) + audit; service (`crm-activity.ts`);
  routes (`/api/crm/leads`, `[id]` incl. disqualify/requalify); UI (`/crm/leads`, `/new`, `[id]` detail).
- [x] Slice B — Interviews: table + routes + `interview-form` (Karachi tz round-trip) + flat `/crm/interviews`.
- [x] Slice C — Assessments: table + `assessment_documents` (crm-docs) + routes + upload/download +
  `assessment-form` + `assessment-docs` + flat `/crm/assessments` (overdue highlight).
- [x] nav: CRM Leads / Interviews / Assessments; `lead-activity` ties interviews+assessments to a lead.
- [x] `seed-crm.mjs`: flag `is_developer` (Muzammal/Aizaz/Super Admin) + demo lead+interview+assessment.
- [x] DRY: extracted `lib/crm/docs.ts` (EXT + magic-byte check), used by profile + assessment upload routes.

## Gate
- [x] `tsc` clean · `build` green · `npm run report` **ALL §14 PASS** (no regression).
- [x] E2E `tests/e2e/crm-activity.spec.ts` 4/4: admin leads+detail(activity); BD owner disqualify→requalify;
  **another BD can't see the lead (owner-scoping)**; non-BD blocked. Screenshots read.
- [x] review agents (security GREEN, quality no-blockers). Fixes applied:
  - security: `canSeeCrm` gate on the assessment-doc download route; PATCH routes strip `owner_bd_id`
    for non-BD-Lead (RLS already blocked it); tightened WebP magic bytes; validate disqualify category enum.
  - quality: consolidated `Opt` type → `lib/crm/options.ts`; reuse `companyToday()`; extracted
    `formatCrmDatetime()` to `lib/utils.ts` (was duplicated). tsc+build clean; 7/7 CRM E2E re-pass.
- [x] KB synced (`database.md` + `modules/crm/{interviews,assessments,leads-deals}.md` as-built notes).

**SHIPPED 2026-07-01.** Leads pipeline + Interviews + Assessments live, owner-scoped, with disqualify.
Follow-ups (noted): dedicated owner-reassign action; RLS-suite coverage for the new tables; the
assessment-doc `label` field isn't yet exposed in the upload UI.