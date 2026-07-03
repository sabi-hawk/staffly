# FRD-07 — CRM Leads Redesign (unified hub · thread model · admin alerts)

| | |
|---|---|
| **Status** | Approved |
| **Module** | CRM · Leads / Interviews / Assessments |
| **Created** | 2026-07-04 |
| **Updated** | 2026-07-04 |
| **Plan** | [../../plans/delegated-noodling-lerdorf.md](../../plans/delegated-noodling-lerdorf.md) |
| **Changelog refs** | 2026-07-04 (CRM Leads redesign) |
| **Revises** | [FRD-02 Interviews](FRD-02-interviews.md), [FRD-03 Assessments](FRD-03-assessments.md), [FRD-04 Leads & Deals](FRD-04-leads-deals.md) — lead-status model, information architecture, and the add flow. |

> Reshape the CRM so a **lead is the per-company thread** and everything about a company lives in one
> place. Replaces three flat nav items (Leads / Interviews / Assessments) with **one CRM Leads hub**
> (tabbed: a card/thread view + interview & assessment grids), a **type-first Add flow**, a **clear
> pipeline status** (distinct from activity state), per-record **feedback**, an editable **received**
> date, and an **admin alert when a lead is closed**.

---

## 1. Background & context
Today (as-built, FRD-02/03/04): a `lead` already groups its interviews + assessments via `lead_id`, and
a won lead already becomes an admin-only `deal`. But the UX fragments this: **CRM Leads, Interviews, and
Assessments are three separate flat nav items**, the interview/assessment list pages are **read-only**,
and activity can **only** be created by opening a lead first. Worse, the lead `status`
(`open/interviewing/assessment/won/lost/disqualified`) **mixes activity with outcome** — a first touch
can be an assessment *or* an interview, so "interviewing/assessment" as a *lead* status is meaningless.
There is **no email-received date** on leads/interviews, **no per-record feedback**, and **no admin
alerting** (the topbar bell is a dead button). This FRD keeps the sound data spine and fixes the model +
IA + flow on top of it.

## 2. Goals & non-goals
**Goals:** one company-keyed CRM hub; a pipeline status that means something; a card/thread view per
company; a simple type-first add flow that associates activity to the right company (incl. interview
rounds); per-record feedback; an editable received date; an admin alert on close.
**Non-goals:** changing the **Deals** module (stays admin-only; "Closed" does **not** auto-create/flag a
deal — it only alerts); a full generic notifications system (alerts are scoped to the lead-closed event,
admin-facing, 30-day window); a standalone `companies` entity (company stays a text key).

## 3. Users & roles
- **BD** (`department='Business Development'`): manages **their own** leads/interviews/assessments
  (`owner_bd_id = auth.uid()`); uses the hub + add flow; sets lead status incl. **Closed**.
- **BD-Lead / Admin / Super-admin**: see & manage all (existing `auth_is_bd_lead()` semantics).
- **Admin / Super-admin**: receive **crm_alerts** (bell). Deals remain admin-only (unchanged).
- **Engineers / other employees**: no CRM (unchanged).

## 4. Functional requirements
- **FR-1 Lead = per-company thread.** Keep `leads` as the grouping record; interviews/assessments keep
  `lead_id`. One lead per company/opportunity for a BD.
- **FR-2 Lead status remodel.** `status ∈ {in_progress, on_hold, closed, rejected, dismissed}` with
  icons (Closed = positive). **Migrate** existing: `open|interviewing|assessment → in_progress`,
  `won → closed`, `lost → rejected`, `disqualified → dismissed`. `rejected` & `dismissed` require a
  **reason/feedback** (dismissed reuses the existing `disqualified_*` columns for audit continuity).
- **FR-3 Feedback.** Free-text `feedback` on **lead**, **interview**, **assessment** (interview keeps
  its `outcome` dropdown: pending/selected/rejected/on_hold).
- **FR-4 Dates.** *Entry* = `created_at` (system, read-only). **Received** (email arrival) = editable,
  **defaults to today** — new `interviews.received_date`; `assessments.entry_date` reused & relabelled
  "Received". *Modified* = `updated_at`. All three are grid columns.
- **FR-5 CRM Leads hub.** One page with tabs — **Leads** (card/thread view), **Interviews** (grid),
  **Assessments** (grid). Each grid has date-range presets **1 week / 1 month / 3 months / custom**
  (default 1 month) over the Received date.
- **FR-6 Leads card view.** One card per lead: company (prominent), **status badge + icon**, dev
  profile, a compact **interview summary** (round · date · status/outcome) and **assessment summary**
  (done/passed), with inline **edit**, **change status** (reason prompt required for rejected/dismissed),
  and **feedback**.
- **FR-7 Type-first Add flow.** An **Add** action → choose **Interview** or **Assessment** → choose
  **New company** (creates the lead, status `in_progress`, + the first activity) or **Existing company**
  (a **searchable, recent-first** combobox → attaches the activity to that lead). For an interview on an
  existing company, the **round auto-advances** to the next value.
- **FR-8 Nav / IA.** Remove standalone **Interviews** & **Assessments** nav items; **CRM Leads** is the
  hub. Old `/crm/interviews` & `/crm/assessments` **redirect** into the hub tabs (no dead links).
- **FR-9 Admin alert on close.** When a lead transitions to `closed`, insert a **`crm_alerts`** row. The
  admin **topbar bell** shows a **red unread badge** and a dropdown of alerts from the **last 30 days**
  ("<BD> closed a lead — <company> — review"); opening marks them read.

## 5. Data model (high level)
| Entity | Key/changed fields | Notes |
|--------|-----|-------|
| `leads` | status → **new 5-value** CHECK; **+`feedback text`**; keep `disqualified_category/note/by/at` as the **dismiss reason** | company stays text (the thread key). Migrate old status values. |
| `interviews` | **+`received_date date`** (editable, default today), **+`feedback text`** | `round` already exists (1st/2nd/3rd/final); auto-advance on add-to-existing. |
| `assessments` | **+`feedback text`**; `entry_date` = **"Received"** | already has deadline/completion_date. |
| `crm_alerts` *(new)* | id, type (`lead_closed`), lead_id→leads, actor_bd_id→profiles, company, message, created_at, read_at | **admin/super read+update**; **insert only via a SECURITY-DEFINER trigger** on `leads` (status→closed). |

## 6. Permissions & security
- `leads/interviews/assessments` RLS unchanged (owner-scoped via `owner_bd_id` + `auth_is_bd*`).
- `crm_alerts`: **admin/super_admin** read + update (mark-read) only; **no client insert** (trigger-only,
  so a BD can't forge alerts and RLS on an admin-only table isn't a barrier). Policies in the **same
  migration** (golden rule).
- Deals/financial data untouched and still admin-only. No PII in alert messages (company + BD name only).

## 7. Screens & UX
- **CRM → Leads** hub with a tab bar (`?tab=leads|interviews|assessments`). Reuse the existing
  `DateRangeFilter` pattern for grid presets; pagination + empty states + toasts + back links.
- **Add** button opens the type-first flow (Interview/Assessment → New/Existing company → fields).
- **Topbar bell** (admin): unread red dot/badge + popover list (last 30 days) + mark-read.

## 8. Business rules
- Lead status transitions are free (any → any) but `rejected`/`dismissed` **require** a reason.
- `received_date` defaults to today; `created_at`/`updated_at` are system-managed (never user-edited).
- Interview `round` on add-to-existing = next after the current max for that lead.
- A `closed` transition fires **exactly one** alert per transition (not on every save while already closed).
- "Closed" does **not** create a deal — deals remain a separate, manual, admin-only action.

## 9. Integrations & dependencies
- Builds on FRD-01 (profiles), FRD-05 (roles/access), FRD-02/03/04 (the entities). Analytics
  (`/crm/analytics`) must keep counting leads/interviews/assessments under the new status set (active =
  not dismissed).

## 10. Acceptance criteria
- [ ] Lead status is the 5-value set; existing rows migrated; rejected/dismissed require a reason.
- [ ] `feedback` writable on lead/interview/assessment; `received_date` editable (default today).
- [ ] One CRM Leads hub with Leads(cards)/Interviews/Assessments tabs + 1wk/1mo/3mo/custom filters;
      standalone Interviews/Assessments nav items gone; old routes redirect.
- [ ] Add flow: new company creates a lead + first activity; existing company attaches (interview →
      next round); company picker is searchable, recent-first.
- [ ] Setting a lead Closed creates a `crm_alerts` row; admin bell shows it (red badge, last 30 days,
      mark-read); a BD cannot read `crm_alerts` (RLS-verified).
- [ ] BD and Engineer demo logins exist; Shaiza has ≥2 dev_profiles + sample leads/activity; engineer
      sees no CRM.

## 11. Reporting / analytics
- Existing BD Performance page continues to work; "active leads" now = status ≠ `dismissed` (and not
  `rejected`? — see §12 Q2). Closed leads are countable as wins.

## 12. Open questions
- [x] **Q1** Lead↔type model. **RESOLVED 2026-07-04:** lead = per-company thread; the type is chosen per
      *activity* at add-time (Interview/Assessment), both attach to the same lead.
- [x] **Q2** Status set. **RESOLVED 2026-07-04:** In Progress / On Hold / Closed / Rejected / Dismissed
      (icons; Closed positive). Analytics "active" excludes `dismissed` at minimum (confirm rejected
      treatment during build — default: rejected & dismissed both excluded from active pipeline count).
- [x] **Q3** Closed → deal. **RESOLVED 2026-07-04:** no auto-deal/flag; raise an **admin alert** only.
      Admin creates the deal manually later (unchanged Deals module).
- [x] **Q4** Feedback. **RESOLVED 2026-07-04:** dedicated free-text feedback on all three; interview
      keeps its outcome dropdown.

## 13. Out of scope / future
- Auto-creating/pre-filling a Deal from a closed lead; BD-facing notifications; a first-class
  `companies` table (dedupe/merge); alert types beyond `lead_closed`.

---

## Change Log
- 2026-07-04 — created from the owner's voice brief + a read-only map of the current CRM. Q1–Q4 resolved
  in-chat → **Approved** (plan approved same day: `plans/delegated-noodling-lerdorf.md`).
