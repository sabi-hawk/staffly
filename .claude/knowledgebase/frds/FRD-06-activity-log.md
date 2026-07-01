# FRD-06 — Activity Log & Audit (Change History)

| | |
|---|---|
| **Status** | Promoted |
| **Module** | Platform-wide · Activity Log / Audit (cross-cutting) |
| **Created** | 2026-07-01 |
| **Updated** | 2026-07-01 |
| **Plan** | [plans/done/04-activity-log](../../plans/done/04-activity-log/plan.md) |
| **Changelog refs** | 2026-06-27 (audit backbone), 2026-07-01 (comprehensive Activity Log) |

> A comprehensive, **readable** change-history for the **whole platform** (HR + CRM). Every mutation is
> logged with **who / what / when / which account / role / time / machine**, and shown with
> **human-readable field-level before→after** diffs — organised **per module**, richly filterable, with a
> **per-record timeline**. Not cryptic one-liners. Extends the portal's existing audit backbone into a
> first-class module.

---

## 1. Background & context
The portal **already has** an audit backbone (do NOT rebuild from scratch — extend it):
- **DB trigger** `record_audit()` (`supabase/migrations/0006_audit.sql`) fires `AFTER INSERT/UPDATE/DELETE`
  on sensitive tables, writing to **`audit_log`**: `actor_id, actor_email, actor_role, action, entity
  (table), entity_id, before (jsonb), after (jsonb), created_at`. It skips writes where `auth.uid()` is
  null (service-role/seed/cron) — see Q5.
- **`login_events`** captures IP + user-agent at sign-in (a browser can't read a MAC address).
- A **super-admin Logs panel** (`app/(app)/admin/logs/page.tsx`) with a hardcoded `ENTITIES` filter array.

**Gaps to close:** (a) **coverage** — not every mutating table has a trigger, and CRM tables are new;
(b) **readability** — raw before/after jsonb isn't a clear, per-field, labelled diff; (c) **UX** —
per-module organisation, per-record timelines, and stronger filtering; (d) **visibility scope** (Q1).

## 2. Goals & non-goals
**Goals:** every change on the platform captured and **easy to understand at a glance**; per-module
browsing; per-record history; clear who/account/role/time/machine; strong filters; trustworthy (append-only).
**Non-goals:** logging **reads** (only mutations); a full SIEM; editing/deleting audit entries.

## 3. Users & roles
- **Super-admin:** sees **everything**, including sensitive payroll/financial changes.
- **Admin / BD Lead:** a **scoped** activity view (CRM + non-financial HR) — exact scope is Q1. (Today the
  Logs panel is super-admin-only, deliberately, so salary changes stay private.)
- **BD / other employees:** no access to the audit module (a BD may see a light "history" on their own
  records — Q2).

## 4. Functional requirements
- **FR-1 Full coverage.** Every mutating table across HR + CRM has a `record_audit()` trigger — attendance,
  leave, employees/profiles, salary/payroll/compensation, credentials, settings, **and** the CRM tables
  (`dev_profiles`, `dev_profile_documents`, `dev_profile_secrets` [value redacted], `interviews`,
  `assessments`, `leads`, `deals`, `deal_documents`, lookups). Add the entity names to the log UI filter.
- **FR-2 Rich capture.** Per entry: actor (name, email, **account/username**, role), action
  (create/update/delete), **module + entity + record label**, timestamp (UTC→Asia/Karachi), before/after,
  and machine info (IP, user-agent) correlated from `login_events`. Secrets/passwords never stored in
  before/after payloads.
- **FR-3 Human-readable diffs.** Render each update as **"<Friendly Field>: old → new"** per changed
  field, with friendly labels (not raw column names/JSON), plus a one-line plain-English summary
  ("Areeba changed Interview #123 status Scheduled → Completed"). Expandable full detail.
- **FR-4 Per-module Activity Log screen.** Tabs/filters by **module** (Interviews, Assessments, Leads,
  Deals, Profiles, Attendance, Leave, Payroll, Employees, Settings…); filter by **actor**, **action**,
  **date range**, **entity/record**; free-text search. Paginated, with empty states. Fast (indexes on
  `entity, entity_id, actor_id, created_at`).
- **FR-5 Per-record timeline.** From any record (e.g. an interview, a lead, an employee), open its full
  chronological change history in a drawer/section.
- **FR-6 Append-only & trustworthy.** Audit rows are immutable (no UI to edit/delete); retention policy (Q4).
- **FR-7 Attribution clarity.** Where a change was made by the system (cron/seed/service-role), label it
  clearly as "System" rather than dropping it (Q5).
- **FR-8 Download/export events.** Downloads of sensitive files (resumes, deal docs) are logged as
  **app-layer** audit events (`action='download'`) from the download route — they aren't DB row-changes,
  so no trigger fires. Same actor/time/machine capture as other entries.

## 5. Data model (high level)
- **Reuse `audit_log`** (extend if needed): consider adding a denormalised `entity_label`/`summary` and an
  `actor_username` for readability, or compute at render time. Field-label maps live in a `lib/*` module
  (server+client safe) so both the summary and detail views share them.
- **`login_events`** joined by actor + time window for IP/user-agent.
- Indexes for the filter dimensions. No secret values ever persisted in `before/after`.

## 6. Permissions & security
- `audit_log` is **super-admin-only** today (RLS). If admin/BD-Lead get a scoped view (Q1), enforce it so
  **payroll/financial** audit entries remain **super-admin-only** while CRM/HR-operational entries are
  visible to the scoped roles. Never expose secret/password fields. No PII in exports/screenshots.

## 7. Screens & UX
- **Activity Log** module in nav (super-admin; scoped for admin/BD-Lead per Q1). Per-module filter bar;
  readable summary rows; expandable field-level diff; actor + account + time + IP; date-range + actor +
  action filters; search; pagination.
- **Record-level "History"** affordance on detail pages across modules.

## 8. Business rules
- Only **mutations** are logged (not reads). Updates show only **changed** fields. Timestamps stored UTC,
  shown Asia/Karachi. Money/PII shown per existing rules; secrets redacted always.

## 9. Integrations & dependencies
- Builds on `supabase/migrations/0006_audit.sql` (`record_audit()`, `audit_log`) + `login_events` + the
  existing Logs page. Every other FRD's tables plug their audit triggers in here (CRM triggers already
  planned in plan 01 and the later CRM plans). Cross-cutting — touches all modules' detail pages for FR-5.

## 10. Acceptance criteria
- [ ] Editing any record in any module produces an audit entry with actor, account, role, time, IP, and a
  readable field-level before→after.
- [ ] A senior BD editing a junior BD's lead is logged and clearly attributed.
- [ ] The Activity Log can be filtered by module, actor, action, and date range, and searched; it paginates.
- [ ] Any record shows its own change timeline.
- [ ] Payroll/financial changes are not visible to non-super-admins (if scoped views are enabled).
- [ ] No secret/password value ever appears in an audit entry.

## 11. Reporting / analytics
- "Who changed what, how often" summaries per actor/module (secondary; the log itself is the core).

## 12. Open questions
- [x] **Q1** Visibility. **RESOLVED 2026-07-01:** **scoped** — super-admin sees all; **admins + BD Leads**
  see a scoped Activity Log (CRM + non-financial HR); **payroll/financial audit entries stay
  super-admin-only**. BDs/other employees: no global log (see Q2).
- [x] **Q2** BD own-record history. **RESOLVED 2026-07-01:** **yes** — a BD sees the change timeline of
  records they own (not the global log, not others' data). Useful when a BD Lead edits their work.
- [x] **Q3** Diff friendliness. **RESOLVED 2026-07-01 (default):** a **generic readable renderer**
  (field-level old→new for all tables) **+ curated friendly labels/summaries for the key modules**
  (interviews, assessments, leads, deals, profiles, payroll). Owner may expand curation later.
- [x] **Q4** Retention. **RESOLVED 2026-07-01 (default):** **keep audit indefinitely** for now; revisit an
  archive/trim policy later if volume warrants.
- [x] **Q5** System attribution. **RESOLVED 2026-07-01 (default):** **capture + label "System"** for
  cron/seed/service-role changes (so nothing silently disappears), rather than dropping them.
- [x] **Q6** Log downloads. **RESOLVED 2026-07-01:** **yes** — record downloads of sensitive files
  (resumes, deal documents) as audit events. Since a download isn't a DB row-change, it's logged at the
  **app layer** (the signed-URL/download route writes an `audit_log` entry, `action='download'`) rather
  than via a DB trigger.

## 13. Out of scope / future
- Real-time alerting on changes; anomaly detection; external SIEM export; logging read access globally.

---

## Change Log
- 2026-07-01 — created. Big cross-cutting module extending the existing audit backbone into a comprehensive,
  readable, per-module Activity Log. Set to In Review with 6 open questions.
- 2026-07-01 — Q1–Q6 resolved (scoped visibility; BD own-record history; generic+curated diffs; keep
  indefinitely; label "System"; log sensitive-file downloads). Added FR-8. → **status = Approved**.
