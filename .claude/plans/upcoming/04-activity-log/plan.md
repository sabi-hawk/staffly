# Plan 04 — Activity Log & Audit (change history)

**Status:** upcoming (awaiting owner approval — no code yet)
**Source:** [FRD-06 Activity Log & Audit](../../../knowledgebase/frds/FRD-06-activity-log.md)
**Depends on:** the CRM tables existing (Plans 01–03) so coverage is complete. Cross-cutting (HR + CRM).

> Turn the portal's existing audit backbone into a comprehensive, **readable**, per-module Activity Log.
> Requirements in FRD-06. This plan is the *how*.

## What & why
Today: `record_audit()` DB triggers → `audit_log` (before/after jsonb) + a basic super-admin Logs panel +
`login_events` (IP/UA). Gaps: full coverage, readable field-level diffs, per-module UX, per-record
timelines, scoped visibility, download logging. This plan closes them.

## Approach — slices
### Slice A — Coverage & capture
- **Migration** `00NN_audit_coverage.sql`: ensure a `record_audit()` trigger on **every** mutating table
  (HR + all CRM tables), skipping secret columns (never log `account_password`). Indexes on
  `audit_log(entity, entity_id, actor_id, created_at)` for fast filtering.
- **System attribution:** capture cron/seed/service-role changes labelled **"System"** (FRD-06 Q5/FR-7)
  rather than dropping when `auth.uid()` is null.
- **Download events (FR-8):** the crm-doc download route writes an `audit_log` entry (`action='download'`)
  for resume/deal-doc downloads (app-layer, no trigger).

### Slice B — Readable rendering
- **`lib/audit/labels.ts`** (server+client-safe, per the RSC rule): friendly field labels + per-entity
  summary builders ("Areeba changed Interview #123 status Scheduled → Completed"). Generic readable
  renderer for all tables + curated labels for key modules (interviews, assessments, leads, deals,
  profiles, payroll). Correlate `login_events` for IP/UA.

### Slice C — Activity Log UI + per-record history
- **`app/(app)/admin/activity`** (rename/extend the existing Logs page): per-**module** filter tabs +
  actor / action / date-range filters + search; readable summary rows with expandable field-level diff;
  actor/account/role/time/IP; pagination + empty states.
- **Scoped visibility (FRD-06 Q1):** super-admin sees all; **admin + BD Lead** see a scoped view (CRM +
  non-financial HR); **payroll/financial entries stay super-admin-only**. Enforce in the query + RLS.
- **Per-record "History"** drawer on detail pages across modules (FR-5); a BD sees history on **their own**
  records only (Q2).

### Slice D — Tests & verification
- RLS/query tests: admin/BD-Lead cannot see payroll/financial audit entries; super-admin can; BD sees only
  own-record history.
- Integration: an edit produces a readable diff entry; a download produces a `download` entry; a System
  change is labelled.
- Browser-verify: Activity Log filtering by module/actor/date; a senior-BD-edits-junior-lead entry shows
  clearly; per-record timeline; payroll hidden from a non-super-admin.

## Key files
`supabase/migrations/0006_audit.sql` (extend) · new coverage migration · `lib/audit/labels.ts` ·
`app/(app)/admin/logs/page.tsx` → activity module · `login_events` · every module's detail pages (History).

## Rules / acceptance
Append-only, no edit/delete of audit; secrets never logged; UTC→Asia/Karachi; scoped visibility exact.
Acceptance = FRD-06 §10.

## Gate
`tsc` clean · `build` green · `npm run report` all-PASS · browser screenshots · KB + `database.md` updated.

## Out of scope
Real-time alerting, anomaly detection, external SIEM export, global read-logging (FRD-06 §13).
