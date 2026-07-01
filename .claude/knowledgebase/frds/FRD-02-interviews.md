# FRD-02 — Interviews

| | |
|---|---|
| **Status** | Promoted |
| **Module** | CRM · Interviews |
| **Created** | 2026-06-30 |
| **Updated** | 2026-07-01 |
| **Plan** | [plans/upcoming/02-crm-activity](../../plans/upcoming/02-crm-activity/plan.md) |
| **Changelog refs** | 2026-06-30 (CRM business model + first batch) |

> Track interviews a BD secures while applying on a profile's behalf. Replaces the per-BD monthly
> "Interviews" sheet tab (screenshot `image copy 5` in the 2026-06-30 changelog). Each row = one
> interview round for a job/company against a profile.

---

## 1. Background & context
Today each BD has a monthly Google Sheet with an "Interviews" tab. Columns observed: Profile, Lead Owner
(BD), Job Title, Company, Job Post URL, Status, Given By (developer), Whom should give (developer),
Interview Time, Date, Notes, Notes-2, and a second "Status" column used for the round/outcome.

## 2. Goals & non-goals
**Goals:** centralised interview log per BD, owner-scoped; clean status + round tracking; ties to a
profile and (later) a lead/deal.
**Non-goals:** assessments ([FRD-03](FRD-03-assessments.md)); deal closure ([FRD-04](FRD-04-leads-deals.md)).

## 3. Users & roles
- **BD**: create/edit/view interviews for their **assigned profiles** only.
- **Admin/super-admin**: view (and edit) all BDs' interviews; use them for analytics.
- Other employees: no access. (Access foundation: [FRD-05](FRD-05-roles-access.md).)

## 4. Functional requirements (from the sheet)
- **FR-1** Interview record fields: **profile** (FK `dev_profiles`), **lead owner** (BD; FK employee),
  **job title**, **company name**, **job post URL**, **status** (scheduled / completed / pending / …),
  **given by** (developer/employee who attended), **whom should give** (developer who should take the
  next round — must match the round-1 developer), **interview time**, **date**, **notes**, **notes-2**,
  and **round** (the renamed second status: Round 1/2/3/Final — and/or an outcome like Rejection/Selected).
- **FR-2** Rename the ambiguous second "Status" → **Round** (distinct from scheduled/completed status).
  Decide whether round and outcome are one field or two (see Q1).
- **FR-3** Grid view per BD: paginated, filterable (by profile, status, round, date range), searchable;
  empty state; follows the existing table/pagination pattern.
- **FR-4** Link an interview to a **lead/deal** thread (so all rounds of one opportunity group together) — see Q2.
- **FR-5** Mutations audited (`record_audit()`).

## 5. Data model (high level)
| Entity | Key fields | Notes |
|--------|-----------|-------|
| `interviews` | id, dev_profile_id, owner_bd_id, lead_id, job_title, company, job_post_url, status (scheduled/completed/…), given_by (employee), whom_should_give (employee), interview_at (date+time), notes, notes2, round (1st/2nd/3rd/Final), outcome (Pending/Selected/Rejected/On-hold), created_at, updated_at | FKs → `dev_profiles`, `leads`, `profiles` (BD + developer employees). RLS: BD sees own (`owner_bd_id = auth.uid()`), admin/super-admin all. |

## 6. Permissions & security
Owner-scoped RLS via the FRD-05 `auth_is_bd()` helper; admin/super-admin full. No sensitive PII beyond
contact already in profiles.

## 7. Screens & UX
- **CRM → Interviews** (BD: own; admin: all, filterable by BD). Inline-add row or a form; status/round as
  selects (coloured chips like the sheet). Back link, toasts.

## 8. Business rules
- **Whom-should-give = given-by of round 1**: later rounds of the same lead must be taken by the same
  developer (validate / default).
- Status vs Round are independent (a completed round 1 can still be "Rejection" or move to round 2).

## 9. Integrations & dependencies
- Depends on [FRD-01](FRD-01-profiles.md) (profiles) + [FRD-05](FRD-05-roles-access.md) (access).
- Shares the lead concept with [FRD-03](FRD-03-assessments.md)/[FRD-04](FRD-04-leads-deals.md) (Q2).

## 10. Acceptance criteria
- [ ] A BD logs an interview against an assigned profile and sees only their own interviews.
- [ ] Round and status are separate, clearly labelled fields.
- [ ] Admin can view all BDs' interviews and filter by BD/profile/status/round/date.
- [ ] Same-developer-across-rounds rule is enforced or defaulted.

## 12. Open questions
- [x] **Q1** Round vs outcome. **RESOLVED 2026-07-01:** **two fields** — `round` (1st/2nd/3rd/Final) and
  `outcome` (Pending/Selected/Rejected/On-hold) — separate from `status` (scheduled/completed).
- [x] **Q2** Lead entity. **RESOLVED 2026-07-01:** introduce a **`leads`** entity now — one lead per
  opportunity (company + role + profile); its interview rounds + assessments link to it (`lead_id`), and
  it becomes a Deal when closed (FRD-04). Applies across FRD-02/03/04.
- [x] **Q3** Status set. **RESOLVED 2026-07-01 (default):** Scheduled / Completed / Cancelled (+ Pending
  before a time is set). Override anytime.
- [x] **Q4** Developer source. **RESOLVED 2026-07-01:** `given_by` / `whom_should_give` (and assessments'
  `completed_by`) reference a **portal user flagged as a developer** (`is_developer`) — FK → `profiles.id`.
  Not department-restricted: Engineering employees **and** the founder admin/super-admin accounts qualify
  (FRD-05 FR-7). BD/admin enters the value; developers don't self-log.
- [x] **Q5** Timezone. **RESOLVED 2026-07-01 (default):** store UTC, show **Asia/Karachi** via `lib/time.ts`.

## 13. Out of scope / future
- Calendar integration / reminders for upcoming interviews; ICS export.

---

## Change Log
- 2026-06-30 — created (Draft skeleton) from the kickoff batch; columns captured from the sheet.
- 2026-07-01 — Q1–Q5 resolved (round+outcome split; leads entity; status set; developer picker; timezone)
  → **status = Approved**.
