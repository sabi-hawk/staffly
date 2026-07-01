# 02 — Data Model

Cloud Supabase Postgres 17. Migrations in `supabase/migrations/` (applied via `npm run db:migrate`).
**RLS is enabled on every table.** Update this doc whenever the schema changes.

## Migrations
- `0001_init.sql` — extensions, enums, core + supporting tables, indexes.
- `0002_functions.sql` — `set_updated_at`, `handle_new_user`, `compute_attendance_hours`,
  `working_days`, triggers.
- `0003_rls.sql` — `auth_role()` helper + all RLS policies.
- `0004_softonoma_v2.sql` — employee fields (code, email2, gender, bank/account), dynamic
  `compensation_components`, payroll payment columns, `payslip_components`.
- `0005_employee_dob.sql` — `profiles.date_of_birth` (age computed in-app).
- `0006_audit.sql` — generic `record_audit()` trigger on sensitive tables (skips service-role/
  seed writes), `audit_log` enriched (actor_email/role, ip/ua), `login_events` table; audit +
  login visibility restricted to **super_admin**.
- `0007_private_pii.sql` — `employee_private` (CNIC + bank), self/super-admin RLS.
- `0008_usernames_credentials.sql` — `profiles.username` (login), `employee_credentials`
  (portal_password; admin/super/self read), `commission_policies` (BD %, super-admin),
  `resolve_login_email(identifier)` RPC (username→email, pre-auth), `profiles` read tightened to
  authenticated only.
- `0009_sessions_probation_notifications.sql` — `attendance_sessions` (multi check-in/out; day
  total = sum of completed sessions, via reworked `compute_attendance_hours` + `recompute_attendance_day`
  trigger), `profiles.contract_type` (permanent|probation), `admin_notifications` (probation/
  payslip/birthday, dedup_key), `holidays.type`, `announcements.body_text`.
- `0010_crm_access.sql` — **CRM access foundation**: `departments` lookup (+seed, backfill from the
  free-text `profiles.department`); `profiles.department_id`, **`is_bd_lead`**, **`is_developer`**;
  `guard_profile_privileged_cols()` BEFORE-UPDATE trigger (non-admins can't self-edit role/status/
  department/CRM flags); `auth_department()`, **`auth_is_bd()`** (keyed on the text `department` for a
  single drift-free source), **`auth_is_bd_lead()`**; departments RLS + audit trigger.
- `0011_crm_profiles.sql` — **CRM Profiles**: `dev_stacks` (+seed), `dev_profiles`,
  `dev_profile_secrets` (account password; **not audited**), `dev_profile_documents` (resume|
  cover_letter; one primary resume via partial unique index); RLS + audit triggers.
- `0012_crm_fixes.sql` — review fixes: guard the text `department` too; `dev_profile_documents.updated_at`;
  atomic `crm_set_primary_document()`.
- `0013_crm_leads_activity.sql` — **CRM Leads/Interviews/Assessments**: `leads`, `interviews`,
  `assessments`, `assessment_documents`; **owner-scoped** RLS (BD manages own; BD-Lead/admin all) + audit
  + updated_at triggers.

## Leave rules (current)
- Annual: accrues 1/month (from Jan 1 or probation-end) up to 8, carried within the calendar year,
  resets Jan 1. Derived from approved annual leaves; `requestLeave`/`leaveSummary` in
  `lib/services/leaves.ts`. Probation → 0 annual.
- Casual: 1/month (company_settings.casual_leave_quota), use-it-or-lose-it. Probation → 1 per
  3-month probation window.
- Unpaid: unlimited, deducted. Overlap-guarded; annual-overflow filed as pending unpaid.

## Enums
`user_role(employee|admin|super_admin)`, `employment_type(onsite|remote)`,
`employee_status(active|inactive)`, `attendance_status(present|late|half_day|absent|on_leave)`,
`leave_type(annual|casual|unpaid)`, `leave_status(pending|approved|rejected|cancelled)`,
`salary_type(fixed|fixed_plus_overtime|commission)` *(legacy; compensation is now dynamic)*,
`payroll_status(draft|finalised)`, `alert_type(missed_checkin|missed_checkout|late_arrival|overtime_warning)`.

## Tables (key columns)
- **profiles** (`id`=auth.users.id) — full_name, email, **email_secondary**, role, avatar_url,
  phone, cnic, **gender**, **employee_code (unique 4-digit)**, position, department, reports_to,
  employment_type, status, joining_date, **date_of_birth**, emergency_*, **bank_account_number /
  bank_account_title / bank_name / iban**. RLS: everyone reads; self or admin updates; admin
  insert/delete.
- **shifts** — employee_id, start_time, end_time, days_of_week int[], checkin_buffer_minutes,
  effective_from, is_active. One active shift per employee (managed on the employee detail page).
- **attendance** — employee_id, work_date (unique per employee/day), check_in_time,
  check_out_time, sources, status, work_log jsonb (Tiptap), expected_hours, **total_hours /
  deficit_hours / extra_hours** (trigger-computed), is_edited, edited_by, edit_reason.
- **leave_requests** — employee_id, type, start/end_date, days_count, reason, status,
  approved_by/at, decision_note.
- **leave_balances** — employee_id, year, annual_total/used, casual_month, casual_used, unpaid_used.
- **salary_structures** *(super_admin)* — employee_id, base_salary, currency. (type/overtime_rate/
  commission_rate/benefits are legacy, unused — additions are dynamic now.)
- **compensation_components** *(super_admin)* — employee_id, **label, amount, description,
  recurring, is_active**. Dynamic per-employee additions (fuel allowance, deal commission, etc.).
- **payroll_runs** *(super_admin)* — employee_id, period_start/end, working_days, days_present,
  unpaid_days, total_hours, total_extra/deficit_hours, base_salary, overtime_pay, commission_amount,
  benefits_total, deductions, **additions_total**, net_pay, status, **payment_status(pending|paid),
  paid_at, paid_amount, credited_account**, generated_by, finalised_at.
- **payslip_components** *(super_admin)* — payroll_run_id, label, amount, **kind(base|addition|
  deduction)**, description. Editable/deletable line items for a specific payslip.
- **audit_log** — actor_id/email/role, action (insert|update|delete|domain events), entity,
  entity_id, before/after jsonb, ip_address, user_agent, created_at. Written by `record_audit()`
  triggers on profiles/attendance/leave_requests/leave_balances/shifts/salary_structures/
  compensation_components/payroll_runs/payslip_components. **Super-admin read only.**
- **login_events** — user_id, email, ip_address, user_agent, created_at (captured at sign-in by
  `/api/audit/login`). **Super-admin read only.**
- **announcements, holidays, documents, alerts_log, company_settings** — supporting.

### CRM tables (0010–0011)
- **departments** — id, name (unique), sort_order, is_active. Lookup; `profiles.department_id` FK.
  RLS: read all; write admin/super. (profiles also gained **`is_bd_lead`**, **`is_developer`**.)
- **dev_stacks** — id, name (unique), sort_order, is_active. Extendable stack lookup. RLS: read any
  authenticated; write admin/super.
- **dev_profiles** — id, name, stack_id→dev_stacks, **owner_bd_id→profiles** (a BD; null=Unassigned),
  email, mobile, dob, status(active|inactive), notes ("LinkedIn banned" lives here). A standalone
  marketing identity (no person FK). RLS: **BD sees own (owner=self); BD-Lead+admin see all**;
  create/edit/assign admin/super only. Audited.
- **dev_profile_secrets** — dev_profile_id (PK/FK), account_password, updated_by. **admin/super only**
  (never BD). **Not audited** (keeps the password out of `audit_log`).
- **dev_profile_documents** — id, dev_profile_id, doc_type(resume|cover_letter), label, is_primary,
  file_path (private `crm-docs` bucket), file_name, uploaded_by. One primary resume per profile
  (partial unique index). RLS: same visibility as parent profile; write admin/super. Audited.
  Downloads are logged as `audit_log` action=`download` from the download route.
- **leads** — id, company, role, dev_profile_id→dev_profiles, owner_bd_id→profiles (a BD), status
  (open|interviewing|assessment|won|lost|**disqualified**), disqualified_category
  (fake_job|low_pay|unpaid_collab|other), disqualified_note/by/at. Groups interviews+assessments.
- **interviews** — id, lead_id→leads, dev_profile_id, owner_bd_id, job_title, company, job_post_url,
  status(pending|scheduled|completed|cancelled), given_by/whom_should_give→profiles (is_developer),
  interview_at (UTC), **round**(1st|2nd|3rd|final), **outcome**(pending|selected|rejected|on_hold),
  notes, notes2.
- **assessments** — id, lead_id, dev_profile_id, owner_bd_id, job_title, company, status(pending|
  in_progress|completed|cancelled), entry_date, deadline, completion_date, mail_subject, job_post_url,
  job_description, completed_by→profiles, priority(high|medium|low), budget(text), assessment_link,
  duration(15m…2h+), notes, extra.
- **assessment_documents** — id, assessment_id, doc_type(resume_cv|extra), label, file_path (private
  `crm-docs` bucket), file_name, uploaded_by. Downloads audit-logged.
  RLS for leads/interviews/assessments/(their docs): **owner-scoped** — `auth_is_bd_lead() OR
  (owner_bd_id = auth.uid() AND auth_is_bd())`; a BD manages only their own, BD-Lead/admin manage all.

## Functions & triggers
- `compute_attendance_hours()` (BEFORE INSERT/UPDATE on attendance) — computes total/deficit/extra
  from check-in/out vs expected; **non-netting** (deficit & extra independent). Mirrors `lib/hours.ts`.
- `working_days(employee, start, end)` — scheduled working days excl. holidays; used by leave &
  payroll & reports.
- `handle_new_user()` — inserts a profile row when an auth user is created.
- `auth_role()` — caller's role (security definer) used by RLS.
- `auth_is_bd()` / `auth_is_bd_lead()` / `auth_department()` — CRM access helpers (security definer).
  `auth_is_bd()` = admin/super OR text `department='Business Development'`; `auth_is_bd_lead()` = admin/
  super OR `is_bd_lead`.
- `guard_profile_privileged_cols()` — BEFORE UPDATE on profiles; blocks a non-admin actor from changing
  role/status/department_id/is_bd_lead/is_developer (service-role + admins pass). Closes the self-update
  escalation hole (the self-update policy has no column check — used for avatar).
- `set_updated_at()` — on all tables with updated_at.

## RLS summary
- profiles: read all; update self or admin; insert/delete admin.
- attendance/leave_requests/leave_balances/shifts/documents/alerts: employee sees own; admin all.
- **salary_structures, payroll_runs, compensation_components, payslip_components: super_admin ONLY.**
- company_settings: read all; write super_admin. audit_log: super_admin read.
- **CRM**: `dev_profiles`/`dev_profile_documents` — BD sees own (owner=self), BD-Lead+admin all, write
  admin/super. `dev_profile_secrets` — admin/super only. `departments`/`dev_stacks` — read all, write
  admin/super. CRM route gating in middleware: `/crm/*` = BD-or-admin, `/crm/deals` = admin/super.

## Storage
- **Avatars** — public bucket **`avatars`** (key `<employee_id>.<ext>`), via `/api/upload/avatar`
  (service-role, self-or-admin check); `profiles.avatar_url` = public URL.
- **CRM docs** — **PRIVATE** bucket **`crm-docs`** (key `<dev_profile_id>/<uuid>.<ext>`) for resumes/
  cover letters. Upload via `/api/crm/profiles/[id]/documents` (admin-only). Download via
  `/api/crm/documents/[docId]/download` — RLS-checked, short-lived **signed URL**, audit-logged. Both
  buckets created/verified by `npm run storage:setup`.

## Known caveats
- Direct `DATABASE_URL` host is IPv6-only; tooling uses `SUPABASE_DB_URL` (session pooler, same DB).
