# 03 — Business Rules (must never be violated)

These are the rules that define correctness. Tests enforce them; agents must not regress them.

## Hours & attendance
- Per day: `total = checkout − checkin` (2dp); `expected` = shift duration snapshot;
  `deficit = max(expected − total, 0)`; `extra = max(total − expected, 0)`.
- **NON-NETTING (founder rule)**: extra hours on one day **never** reduce another day's deficit.
  Period summaries report **gross** total deficit and **gross** total extra, separately.
- Deficits are **visibility-only** — never auto-deducted from pay (the founder decides).
- Implemented identically in the DB trigger (`compute_attendance_hours`) and `lib/hours.ts`.
- **Check-in is idempotent**: a second check-in the same day returns the first unchanged.
- **Late** if check-in is after `shift.start + checkin_buffer_minutes`.
- Checkout cannot precede check-in and cannot exceed "now" (for self check-out).
- **Editing**: employees may edit their own current-day checkout; admins/super-admins may edit
  **both** check-in and check-out on any record (reason expected). Every edit writes `audit_log`
  and sets `is_edited`; the trigger recomputes hours.
- **Missed-checkin/checkout/overtime** alert crons run every 15 min, are idempotent, and
  de-duplicate via `alerts_log`. Cron routes require `Authorization: Bearer ${CRON_SECRET}`.

## Leave
- **Annual**: 8 per year; must be requested **≥ 21 days in advance** (admin may override).
  Approval required; on approval `annual_used` increments. If a request exceeds remaining annual,
  the overflow is filed as **unpaid** (and the user is told).
- **Casual**: **max 2 days per calendar month** (paid, auto-approved). Enforced on request.
- **Unpaid**: unlimited, recorded, **deducted** at payroll.
- Admin can **add/convert** a leave for any employee/date/type (e.g. turn a missing day into
  casual/unpaid/paid) via `/api/admin/leaves`.
- `days_count` always computed via `working_days()` (excludes weekends per shift + holidays).

## Payroll & compensation  (Super Admin ONLY)
- Net = `base_salary + Σ additions − Σ deductions` for a period.
  - **Additions are dynamic** `compensation_components` (label, amount, description, recurring).
    There is no fixed OT/commission/benefit model anymore.
  - Deductions = `(unpaid_days + unexcused_absent_days) × (base_salary / working_days_in_period)`.
    Deficit hours are **not** auto-deducted.
- A **payslip** is a `payroll_run` + its `payslip_components` (base / additions / deductions),
  editable per payslip (add/edit/delete lines, with descriptions).
- Each run has a **payment_status** (`pending`/`paid`) with `paid_at`, `paid_amount`,
  `credited_account`. Payment history is filterable per employee + month range.
- Payslips are **printable + downloadable as PDF**.

## Permissions (defense in depth: middleware + RLS + UI)
- **Salary, payroll, compensation, payslips → Super Admin only.** Admin/HR are excluded entirely.
- **Employees** can read their own data and change **only their profile photo**; all other profile
  fields are managed by Admin/Super Admin.
- CNIC and compensation are never sent to clients lacking permission.

## Defaults (when unspecified)
- Currency PKR; timezone Asia/Karachi; week starts Monday; working days Mon–Fri.
- Casual 2/month, annual 8/year, annual notice 21 days, missed-checkin buffer per shift,
  missed-checkout grace 1h, overtime warning 2h (overridable in `company_settings`).
- Employee codes are unique 4-digit numbers. Default password for seeded employees: `Softonoma@123`.
