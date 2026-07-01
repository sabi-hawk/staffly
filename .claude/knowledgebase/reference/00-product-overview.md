# 00 — Product Overview

## What it is
**Softonoma Employee Portal** — an internal HR & workforce-management web app for Softonoma.
It is the single source of truth for who is working, when, for how long, what they produced,
what they are owed, and where time is being lost.

## Who uses it (roles)
- **Employee** — checks in/out, writes a daily work log, applies for leave, views their own
  attendance/leave, edits their own profile photo (other details are read-only to them).
- **Admin / HR** — manages employees, shifts, attendance, approves leave, runs reports.
  **Cannot** see salary/payroll (locked by RLS).
- **Super Admin** (founder) — everything Admin can do **plus** compensation, payroll,
  payslips, payments, and company settings.

## Core capabilities
1. **Attendance** — check-in/out with live timer, work logs (Tiptap), per-day hours with
   deficit/extra, admin edit of both timestamps, missed check-in/out alert crons.
2. **Leave** — annual (8/yr, ≥21-day notice), casual (≤2/month), unpaid (unlimited, deducted);
   approval queue; admin can convert a missing day into a leave.
3. **Employees** — rich profiles (contacts, CNIC, DOB/age, bank/account, per-employee shift),
   dynamic compensation categories, attendance analytics with date ranges, avatars.
4. **Payroll** — monthly payslips: base salary + dynamic additions − deductions = net; paid/
   pending status; payment history; printable + PDF payslips. **Super Admin only.**
5. **Reports & analytics** — date-range summaries (hours, deficit/extra, leaves, missing days),
   CSV export, pagination everywhere.

## Status
v1 (generic "Staffly") was built and cloud-verified. We are now in the **v2 Softonoma
overhaul** (real branding, light theme, real employees, deeper features) — see
[`04-v2-softonoma-overhaul.md`](04-v2-softonoma-overhaul.md). Target: **production launch within
days** — every change must leave the app shippable.

## Non-negotiables (see [`03-business-rules.md`](03-business-rules.md) for detail)
- **Non-netting hours**: extra hours one day never cancel another day's deficit.
- **Compensation privacy**: salary/payroll are Super Admin only; Admin/HR are excluded.
- **Employees can't edit their own profile fields** (only their photo).
