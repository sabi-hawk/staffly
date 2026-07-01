# Plan 02 — CRM Activity: Leads + Interviews + Assessments

**Status:** upcoming (awaiting owner approval of the approach — no code yet)
**Sources:** [FRD-02 Interviews](../../../knowledgebase/frds/FRD-02-interviews.md) ·
[FRD-03 Assessments](../../../knowledgebase/frds/FRD-03-assessments.md) ·
[FRD-04 Leads & Deals](../../../knowledgebase/frds/FRD-04-leads-deals.md) (the **leads** part) ·
access: [FRD-05](../../../knowledgebase/frds/FRD-05-roles-access.md)
**Depends on:** Plan 01 (access foundation + `dev_profiles`). **Followed by:** Plan 03 (Deals), Plan 04 (Activity Log).

> The day-to-day BD activity: a **Lead** groups an opportunity's **interview rounds** + **assessments**.
> BDs manage their own; BD Leads manage all BDs'; admins/super-admins all. Requirements in the FRDs.

## What & why
Replace the per-BD monthly Google Sheets (Interviews + Assessments tabs) with on-platform, access-scoped
grids tied to a Lead. Enables tracking, filtering, and BD performance visibility; feeds Deals (plan 03).

## Approach — slices
### Slice A — Leads
- **Migration** `00NN_crm_leads.sql` (RLS in-file): `leads` (company, role, dev_profile_id, owner_bd_id,
  status open/interviewing/assessment/won/lost/**disqualified**, disqualified_category/note/by/at).
  RLS: BD own (`owner_bd_id = auth.uid()`), **BD Lead all** (`auth_is_bd_lead()`), admin/super all.
  Audit trigger + Logs `ENTITIES` entry.
- **Disqualify flow** (BD + admin): set status disqualified with category (fake_job/low_pay/unpaid_collab/
  other) + required note; excluded from BD lead-count analytics; admin can re-qualify. All audited.
- **Service** `lib/services/leads.ts`; **UI** `app/(app)/crm/leads` (BD: own pipeline by status; admin/
  BD-Lead: all, filter by BD/profile/status).

### Slice B — Interviews
- **Migration** `00NN_crm_interviews.sql`: `interviews` (dev_profile_id, lead_id, owner_bd_id, job_title,
  company, job_post_url, **status** scheduled/completed/cancelled, **given_by**/**whom_should_give**
  (employees flagged `is_developer`), interview_at (UTC), notes, notes2, **round** 1st/2nd/3rd/Final,
  **outcome** Pending/Selected/Rejected/On-hold). RLS same shape as leads. Audit + ENTITIES.
- **Rule:** later rounds default `whom_should_give` = round-1 `given_by` (same developer across rounds).
- **Service** `lib/services/interviews.ts`; **UI** `app/(app)/crm/interviews` grid (chips for status/
  round/outcome; time shown Asia/Karachi via `lib/time.ts`; filter by profile/status/round/date).

### Slice C — Assessments
- **Migration** `00NN_crm_assessments.sql`: `assessments` (…, status pending/in-progress/completed/
  cancelled, entry_date, deadline, completion_date, completed_by (employee), priority, budget (text),
  assessment_link, **duration** lookup 15m/30m/45m/1h/1.5h/2h/2h+, notes, extra) + `assessment_documents`
  (resume_cv|extra, private `crm-docs` bucket). RLS same shape. Audit + ENTITIES. Overdue = deadline
  passed & not completed.
- **Service** `lib/services/assessments.ts`; **UI** `app/(app)/crm/assessments` grid (priority/status
  chips, overdue highlight, duration filter; upload resume/extra via the crm-doc route from plan 01).

### Slice D — Tests & verification
- RLS tests: BD sees only own leads/interviews/assessments; **BD Lead sees + edits all**; non-BD blocked.
- Integration: lead→interview/assessment linkage; disqualification excludes from counts; same-developer
  default; overdue detection.
- Browser-verify: BD grids (own), BD-Lead grid (all + edit a junior's row), disqualify flow, uploads.

## Key files
`supabase/migrations/` · `lib/services/{leads,interviews,assessments}.ts` · `app/(app)/crm/*` ·
`lib/time.ts` · `lib/pagination.ts` + `components/ui/{table,pagination}.tsx` · the crm-doc upload route
+ private bucket (from plan 01) · `app/(app)/admin/logs/page.tsx` (ENTITIES).

## Rules / acceptance
Golden rules in `CLAUDE.md` (RLS-in-migration, `auth_is_bd()`/`auth_is_bd_lead()`, RSC pitfall, non-netting
etc.). Acceptance = FRD-02 §10 + FRD-03 §10 + FRD-04 lead criteria.

## Gate
`tsc` clean · `build` green · `npm run report` all-PASS (new RLS + integration) · browser screenshots ·
KB + `database.md` updated same change.

## Out of scope (other plans)
Deals closure + documents + accounts/methods → Plan 03. Rich Activity Log UI → Plan 04 (audit triggers
are added here per-table; the readable log screen is plan 04).
