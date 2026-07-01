# Tasks — Plan 04: Activity Log & Audit (FRD-06)

Extends the existing audit backbone (record_audit triggers → audit_log) into a readable, scoped module.

## Progress
- [x] `0017`: audit coverage (+employee_private/credentials/commission/settings), indexes, **scoped
  `audit_read` RLS** (super all · admin/BD-Lead non-financial · BD own CRM records).
- [x] `lib/audit/labels.ts` (readable entity/field labels, summaries, value formatting, secret masking);
  enhanced `components/admin/logs-table.tsx`.
- [x] Activity Log page: admin-accessible, per-module/action/actor/date filters, login section super-only.
  Nav "Activity Log" in adminNav.
- [x] `RecordHistory` component + History card on profile/lead/deal detail pages.

## Review gate
- [x] Security **RED→GREEN**: 2 blockers fixed — (1) `0018` adds `auth_is_bd()` to the audit BD arm
  (a non-BD whose UUID was set as owner_bd_id could otherwise read that record's audit); (2) updated
  `security.md` + DECISIONS.md #26 for the deliberate audit-scope relaxation.
- [x] Quality: H1 (AuditRow → module scope, no remount), H2 (date filter Asia/Karachi via
  `karachiMidnightISO`), deal History gated to super-admin, `as AuditLog[]` cast, topbar "Activity Log",
  snapshot `false`/`0` values shown.
- [x] tsc + build clean; `npm run report` ALL §14 PASS (RLS 15/15, test updated for scoped audit);
  activity-log E2E 2/2 (readable log + BD own-record history); screenshot read.

**SHIPPED 2026-07-02.** Readable, scoped Activity Log + per-record history. Deferred (noted in
`modules/crm/activity-log.md`): "System" attribution for cron/service writes; global-log nav for BD-Leads.
