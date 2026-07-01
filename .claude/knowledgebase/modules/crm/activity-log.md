# Activity Log & Audit (platform-wide)

A comprehensive, **readable** change-history across the whole platform (HR + CRM). Requirements:
[FRD-06](../../frds/FRD-06-activity-log.md). Delivery: Plan 04. Cross-cutting (not CRM-only).

## What it is
Extends the existing audit backbone into a first-class module: **who changed what, when, using which
account, role, time, and machine**, with **human-readable field-level before→after** diffs, per-module
browsing, and per-record timelines.

## Foundation (already exists — extend, don't rebuild)
- `record_audit()` trigger (`supabase/migrations/0006_audit.sql`) → **`audit_log`** (actor_id,
  actor_email, actor_role, action, entity=table, entity_id, before/after jsonb, created_at). Skips
  writes where `auth.uid()` is null.
- **`login_events`** (IP + user-agent at sign-in). A super-admin Logs panel with an `ENTITIES` filter.

## What this module adds
1. **Full coverage:** a trigger on **every** mutating table (HR + all CRM tables); secret columns never
   logged (e.g. `dev_profile_secrets.account_password`). Indexes on (entity, entity_id, actor_id, created_at).
2. **Readable diffs:** friendly field labels + plain-English summaries ("Areeba changed Interview #123
   status Scheduled → Completed") via a shared `lib/audit/labels.ts` (server+client-safe). Generic
   renderer for all tables + curated labels for key modules.
3. **Per-module Activity Log UI:** filter by module / actor / action / date range + search; expandable
   field-level detail; actor + account + role + time + IP; pagination + empty states.
4. **Per-record history:** every record shows its own timeline; a BD sees history on **their own** records.
5. **Download logging:** sensitive-file downloads (resumes, deal docs) logged as **app-layer** events
   (`action='download'`) from the download route (not a DB row-change).
6. **System attribution:** cron/seed/service-role changes labelled **"System"** rather than dropped.

## Visibility (scoped)
- **Super-admin:** everything (incl. payroll/financial).
- **Admin + BD Lead:** scoped view — CRM + non-financial HR; **payroll/financial entries stay
  super-admin-only**.
- **BD / others:** no global log; a BD sees history on their own records only.

## Rules
Append-only (no edit/delete of audit); only **mutations** logged (not reads); updates show only changed
fields; UTC→Asia/Karachi; secrets/passwords never in payloads; retention = keep indefinitely (for now).

## As-built (Plan 04, 2026-07-02) — shipped
- Migration `0017`: audit coverage for the remaining sensitive tables; audit_log indexes; **scoped
  `audit_read` RLS** — super-admin all; **admin + BD-Lead** see non-financial entries (financial denylist:
  salary/payroll/compensation/payslip/deals/deal_documents/receiving_accounts/employee_private/
  employee_credentials/commission_policies); a **plain BD** sees their own CRM records' history via the
  `owner_bd_id` in the row snapshot.
- **Readable rendering** (`lib/audit/labels.ts`): friendly entity + field labels, plain-English
  summaries ("X updated lead (5 fields)"), value formatting (dates→Karachi, bools, UUID truncation),
  password/secret masking. Powers the enhanced `components/admin/logs-table.tsx`.
- **Activity Log page** (`/admin/logs`, now **admin-accessible**, in `adminNav`): per-module + action +
  actor + date-range filters; login-activity section super-admin-only.
- **Per-record history** (`components/audit/record-history.tsx`): a "History" card on CRM profile / lead /
  deal detail pages — RLS gives a BD their own record's trail, admins/BD-Leads the full one.
- **Download events** already logged (Plans 01/03). **Deferred (FRD-06):** "System" attribution for
  cron/service-role writes (kept skipped to avoid seed noise); a global Activity Log nav entry for BD-Leads
  (they use per-record history — the page lives under `/admin/*`); curated diff labels for more modules.
