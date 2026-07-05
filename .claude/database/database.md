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
- `0014_crm_deals.sql` — **CRM Deals** (admin/super-admin only): `receiving_accounts`, `payment_methods`
  (+seed), `deals`, `deal_documents`; RLS (deals/docs/accounts = admin/super only; payment_methods =
  read-any, write-admin) + audit + updated_at.
- `0015_deal_review_fixes.sql` — deals.salary `CHECK (>= 0)`; `ON DELETE SET NULL` on the deal FKs.
- `0016_crm_audit_fixes.sql` — `ON DELETE SET NULL` on activity person-refs (interviews.given_by/
  whom_should_give, assessments.completed_by, leads.disqualified_by); audit `dev_stacks`.
- `0017_activity_log.sql` — **Activity Log** (FRD-06): audit coverage for employee_private/
  employee_credentials/commission_policies/company_settings; audit_log indexes; **scoped `audit_read`
  RLS** — super-admin all; **admin + BD-Lead** non-financial entries; a **BD** their own CRM records
  (`owner_bd_id` in the row snapshot). Financial (salary/payroll/comp/deals/accounts/PII/credentials)
  stays super-admin-only.
- `0019_security_hardening.sql` — **whole-app audit fixes**: (1) `guard_profile_privileged_cols()`
  hardened — nobody below `super_admin` may change `role` (closes admin **self-escalation** to
  super_admin), non-admins still can't touch any privileged col; service-role (`auth.uid() is null`)
  trusted. (2) `handle_new_user()` hardcodes `role='employee'` (ignores client-supplied signup role).
  (3) Attendance integrity: `company_today()` (Asia/Karachi date); `attendance_sessions` CHECK
  `ended_at >= started_at`; `att_self_insert`/`att_update`/`sessions_self_write` rescoped so an
  employee may only write their **own** attendance for the **current company day** (no
  backdating/forging) — admin/super_admin retain full write for corrections.
- `0020_crm_leads_redesign.sql` — **CRM Leads redesign** (FRD-07): `leads.status` remodelled to
  `in_progress|on_hold|closed|rejected|dismissed` (existing values migrated: open/interviewing/
  assessment→in_progress, won→closed, lost→rejected, disqualified→dismissed) + `leads.feedback`;
  `interviews.received_date` (editable, email-received) + `interviews.feedback`; `assessments.feedback`
  (existing `entry_date` = "Received"). New **`crm_alerts`** table (admin/super read+update RLS; **no
  client insert**) + a SECURITY-DEFINER trigger `crm_alert_on_lead_closed` that inserts one alert when a
  lead transitions **into** `closed`. `disqualified_*` columns retained as the **dismiss** reason.
- `0021_crm_lead_details.sql` — CRM lead detail fields: `leads` +`budget` +`expected_budget`
  +`job_description` +`notes` (BD notepad; job_description/notes are rich-text HTML). `assessments`
  +`whom_should_complete` (uuid→profiles; mirror of `interviews.whom_should_give`). **Backfill**
  `interviews.received_date` / `assessments.entry_date` from `created_at` where null (so the default
  1-month grid filter shows pre-existing rows). New **`lead_documents`** table (resume/file attach per
  lead; owner-scoped RLS via the parent lead; updated_at + audit triggers).
- `0022_dev_profile_docs.sql` — **profile documents v2**: `dev_profile_documents` +`note` +`deleted_at`
  +`deleted_by`; primary-resume unique index re-scoped to active rows (`deleted_at is null`). New
  `can_manage_dev_docs(profile)` (security-definer, `search_path=public`) = owning BD **or**
  `auth_is_bd_lead()`. Replaces the admin-only write policy with **owner insert/update** +
  **admin-only hard delete** (BD delete = soft, an UPDATE setting `deleted_at`). See DECISIONS.md.
- `0023_dev_docs_history_scope.sql` — the "Deleted (history)" list is **admin-only**: `dev_docs_select`
  now hides soft-deleted rows from BD owners / BD-Leads (`admin OR (deleted_at is null AND (bd_lead OR
  owner))`). Also drops the dead `crm_set_primary_document(uuid)` RPC (superseded by the service).
- `0024_dev_docs_soft_delete_fn.sql` — **`crm_soft_delete_document(doc)`** security-definer RPC. After
  0023 a BD owner's own UPDATE that sets `deleted_at` is rejected (the post-update row is no longer
  selectable by that owner), so soft-delete is routed through this function (authorizes via
  `can_manage_dev_docs`, stamps `deleted_by = auth.uid()`). `execute` granted to `authenticated`.
- `0025_lead_contacts.sql` — new **`lead_contacts`** table: the CLIENT company's representatives logged
  against a lead (contact_type hr|recruiter|company_admin|hiring_manager|other, other_type, name, email,
  phone, linkedin_url, note, created_by). For future outreach to past leads. RLS `lead_contacts_scoped`
  (for ALL) **mirrors `lead_documents`** — visible/writable exactly when the parent lead is (BD owner,
  BD-Lead, or admin/super). updated_at + audit triggers.
- `0026_employee_summary_flag.sql` — `company_settings` +`show_employee_attendance_summary boolean not
  null default true`. Admin-toggleable (super-admin settings page): gates whether employees see their
  attendance summary + the deficit/extra column on the Attendance tab (admins always see them). Read by
  all (`settings_read`), written by super_admin (`settings_super_write`).
- `0027_daily_summary.sql` — `attendance` +`daily_summary text` (rich-text HTML, sanitized) +`summary_at
  timestamptz` +`summary_late boolean default false`. One task summary per work day. Rules enforced in
  `saveDailySummary` (service): edit freely same-day; a **past day with a summary is locked**; a past
  day still **missing may be added late** (`summary_late=true`). Self-writable via the existing
  `att_update` RLS (own rows); admins see all + a "missing today" list. (Legacy `work_log` jsonb is now
  superseded by this HTML field in the UI.)
- `0028_daily_summary_fn.sql` — **`save_daily_summary(work_date, html)`** security-definer RPC (returns
  `late` bool). Enforces the rules + updates ONLY the summary columns. Needed because `att_update` (0019)
  blocks employees from updating PAST rows — a direct late-add would silently no-op; the definer lets an
  employee late-add to a past row without being able to edit past times/hours. `execute` to `authenticated`.
- `0033_lead_shift.sql` — `leads` +`shift text` (optional working-hours/timezone note, free text). Note:
  `leads.budget` / `expected_budget` are already **text** (support ranges like "$5,000–$7,000/mo").
- `0032_deal_directory.sql` — **`deal_directory()`** security-definer fn returning deal **name +
  developer + role + status** (NO financials) for **admin/super** callers only (0 rows otherwise). Powers
  the HR-safe `/admin/deal-assignments` page — HR sees which dev is on which deal without the money.
- `0031_deal_developer_flag.sql` — `profiles` +`is_deal_developer boolean default false` (admin-set,
  guarded from non-admins). A deal-assigned developer's leave is client-company-governed: the portal
  **hides their annual/casual balances** and `requestLeave` makes their requests **record-only (pending
  → admin marks)** — bypassing our quota/notice/casual-cap checks. Toggled on the admin employee detail
  ("Roles & flags"). Handbook section added.
- `0030_deals_super_only.sql` — **deals are SUPER-ADMIN only now**: `deals`, `deal_documents`,
  `receiving_accounts`, `deal_developers` (manage) + `payment_methods` (write) tightened from admin+super
  to **super_admin only**. HR (`admin`) can no longer see deal financials/details; developers still see
  their own deal NAME via `my_deals()`. `canSeeDeals` → super only; middleware `/crm/deals` + nav +
  all deal pages/routes gate on super_admin; the lead "Create deal" button is super-only.
- `0029_deal_developers.sql` — `deals` +`name`; new **`deal_developers`** join (deal_id, developer_id→
  profiles, role ∈ developer|closer; unique per (deal,dev,role)) = many-to-many deal↔developer. RLS:
  admin/super manage; a developer may READ their own assignment rows only. **`my_deals()`** security-
  definer fn returns `{deal_id, name, role}` for the caller's deals — so a developer sees the deal NAME
  on their dashboard **without** the admin-only `deals` table (financials) ever being readable to them.

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
- **dev_profile_documents** — id, dev_profile_id, doc_type(resume|cover_letter), label, **note**,
  is_primary, file_path (private `crm-docs` bucket), file_name, uploaded_by, **deleted_at**,
  **deleted_by** (0022). One primary **active** resume per profile (partial unique index scoped
  `where … and deleted_at is null`). RLS (0022): read = same visibility as parent profile; **write
  (insert/update) = owning BD or BD-Lead/admin** via `can_manage_dev_docs(profile)` (owner does
  add / mark-primary / set-note / **soft-delete** — an UPDATE that sets `deleted_at`); **hard DELETE
  = admin/super only** (from the admin "Deleted (history)" list; removes the storage object). Audited.
  Access is logged to `audit_log` — action=`download` (file download) or `view` (in-app inline viewer,
  `?inline=1`) from the download route.
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
- **deals** — id, lead_id→leads, designation, joining_date, dev_profile_id, working_developer→profiles,
  salary (numeric PKR), receiving_account_id→receiving_accounts, payment_method_id→payment_methods,
  profile_dob, status(active|ended|cancelled). **admin/super-admin ONLY.**
- **receiving_accounts** — id, holder_name, bank_name, account_number, notes, is_active. Managed list of
  company accounts. **admin/super-admin only** (sensitive financial).
- **payment_methods** — id, name (unique), sort_order, is_active. Extendable lookup (+seed Direct bank/
  Payoneer/Wise/Other). Read by any authenticated; write admin/super.
- **deal_documents** — id, deal_id, label, file_path (private `crm-docs` bucket, `deals/<id>/…`),
  file_name, uploaded_by. **admin/super only**; downloads audit-logged.

## Functions & triggers
- `compute_attendance_hours()` (BEFORE INSERT/UPDATE on attendance) — computes total/deficit/extra
  from check-in/out vs expected; **non-netting** (deficit & extra independent). Mirrors `lib/hours.ts`.
- `working_days(employee, start, end)` — scheduled working days excl. holidays; used by leave &
  payroll & reports.
- `handle_new_user()` — inserts a profile row when an auth user is created; role is **always
  `employee`** (0019 — never honours a client-supplied signup role).
- `company_today()` — current company date in Asia/Karachi; used by attendance write-scoping policies (0019).
- `auth_role()` — caller's role (security definer) used by RLS.
- `auth_is_bd()` / `auth_is_bd_lead()` / `auth_department()` — CRM access helpers (security definer).
  `auth_is_bd()` = admin/super OR text `department='Business Development'`; `auth_is_bd_lead()` = admin/
  super OR `is_bd_lead`.
- `guard_profile_privileged_cols()` — BEFORE UPDATE on profiles; blocks a non-admin actor from changing
  role/status/department/department_id/is_bd_lead/is_developer (service-role passes). **Hardened in 0019:**
  `role` is now super_admin-only for *everyone* (admins included), closing the admin **self-escalation**
  to super_admin. The self-update RLS policy has no column check (used for avatar), so this trigger is
  the enforcement point.
- `set_updated_at()` — on all tables with updated_at.

## RLS summary
- profiles: read all; update self or admin; insert/delete admin.
- attendance/leave_requests/leave_balances/shifts/documents/alerts: employee sees own; admin all.
- **salary_structures, payroll_runs, compensation_components, payslip_components: super_admin ONLY.**
- company_settings: read all; write super_admin. audit_log: super_admin read.
- **CRM**: `dev_profiles` — BD sees own (owner=self), BD-Lead+admin all, write admin/super.
  `dev_profile_documents` — read same as parent profile; **write = owning BD or BD-Lead/admin**
  (`can_manage_dev_docs`); BD delete = soft (`deleted_at`), **hard DELETE = admin/super only** (0022).
  `dev_profile_secrets` — admin/super only. `departments`/`dev_stacks` — read all, write
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
