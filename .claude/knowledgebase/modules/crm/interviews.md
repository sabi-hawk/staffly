# CRM · Interviews

Per-BD interview tracking. Requirements: [FRD-02](../../frds/FRD-02-interviews.md) + [FRD-07](../../frds/FRD-07-crm-leads-redesign.md).
Delivery: Plan 02 + FRD-07. Schema: `../../../database/database.md`.

> **FRD-07:** interviews are a **tab in the CRM Leads hub** (`/crm/leads?tab=interviews`), not a
> standalone page. Added `received_date` (editable email-arrival date, shown as "Received") + `feedback`.
> Grids show Received / Entry (`created_at`) / Modified (`updated_at`) columns with 1wk/1mo/3mo/custom
> filters. New interviews are created via the hub's type-first **Add** flow (round auto-advances).

## What it is
Each row = one **interview round** for a job/company against a profile, under a **lead**. Replaces the
per-BD monthly sheet "Interviews" tab.

## Data model — `interviews`
id, `dev_profile_id`, `lead_id`, `owner_bd_id`, job_title, company, job_post_url,
**status** (scheduled|completed|cancelled; pending before a time is set),
**given_by** (employee, `is_developer`), **whom_should_give** (employee — the developer for later rounds),
interview_at (UTC; shown Asia/Karachi), notes, notes2,
**round** (1st|2nd|3rd|Final) and **outcome** (Pending|Selected|Rejected|On-hold) — two separate fields,
distinct from status. Timestamps.

## Rules
- **Same developer across rounds:** later rounds' `whom_should_give` defaults to round-1 `given_by`.
- `status` (scheduled/completed) is independent of `round`/`outcome` (a completed round 1 may be
  Rejected or advance to round 2).
- Developers are portal users flagged `is_developer` (Engineering + founders); the BD/admin enters the
  row — developers don't self-log.

## Permissions
BD: own (`owner_bd_id = auth.uid()`). BD Lead: all BDs' (view+manage). Admin/super: all. Others: none.
(See [access.md](access.md).) All mutations audited ([activity-log.md](activity-log.md)).

## Screens
`CRM → Interviews`: grid with coloured chips for status/round/outcome; filter by profile/status/round/
date; time shown Asia/Karachi; per-record history drawer. BD sees own; BD-Lead/admin see all (filter by BD).

## Relationships
Belongs to a [lead](leads-deals.md); references a [profile](profiles.md); developer = an employee.

## As-built (Plan 02, 2026-07-01) — shipped
- Table `interviews` (migration `0013`), owner-scoped RLS (BD own · BD-Lead/admin all). `given_by`/
  `whom_should_give` reference employees flagged `is_developer`. `interview_at` stored UTC, entered/shown
  as **Asia/Karachi** (+5, no DST) — the form round-trips via `toUtcIso`/`toLocalInput`.
- Managed on the **lead detail** (`components/crm/lead-activity.tsx` + `interview-form.tsx`); flat
  read grid at `/crm/interviews`. Service `lib/services/crm-activity.ts`; routes `app/api/crm/interviews/*`.
