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

## Functions & triggers
- `compute_attendance_hours()` (BEFORE INSERT/UPDATE on attendance) — computes total/deficit/extra
  from check-in/out vs expected; **non-netting** (deficit & extra independent). Mirrors `lib/hours.ts`.
- `working_days(employee, start, end)` — scheduled working days excl. holidays; used by leave &
  payroll & reports.
- `handle_new_user()` — inserts a profile row when an auth user is created.
- `auth_role()` — caller's role (security definer) used by RLS.
- `set_updated_at()` — on all tables with updated_at.

## RLS summary
- profiles: read all; update self or admin; insert/delete admin.
- attendance/leave_requests/leave_balances/shifts/documents/alerts: employee sees own; admin all.
- **salary_structures, payroll_runs, compensation_components, payslip_components: super_admin ONLY.**
- company_settings: read all; write super_admin. audit_log: admin read.

## Storage
- **Avatars** are stored in the public Supabase Storage bucket **`avatars`** (object key
  `<employee_id>.<ext>`). Uploaded via `/api/upload/avatar` (service-role, after a self-or-admin
  check); `profiles.avatar_url` holds the public URL. Bucket is created/verified by
  `npm run storage:setup`. Serverless-safe (no local disk writes).

## Known caveats
- Direct `DATABASE_URL` host is IPv6-only; tooling uses `SUPABASE_DB_URL` (session pooler, same DB).
