# 04 — v2 Softonoma Overhaul (feature set & status)

The v2 pass turned the generic "Staffly" demo into the production **Softonoma Employee Portal**.
Status legend: ✅ done · 🔄 in progress · ⏳ planned.

## Branding & theme ✅
- Softonoma wordmark (`public/softonoma-logo.png`) + icon (`public/softonoma-icon.png`) + favicon.
- Light, modern theme (white sidebar, logo-blue accents, soft shadows). Renamed to
  "Softonoma Employee Portal".

## Data & seed ✅
- Migrations `0004`/`0005` (see [`../../database/database.md`](../../database/database.md)).
- 7 real employees seeded with logins (`Softonoma@123`), 4-digit codes, bank details, DOB,
  per-employee shifts, base salaries, dynamic compensation, and ~90 days of attendance.
- Admin logins: `founder@acme.test` (super admin), `hr@acme.test` (admin).

## Pagination ✅
- Reusable `components/ui/pagination.tsx` (page-size 10/25/50/100/200/300). Wired into Employees,
  Admin Attendance; Reports daily grid uses a local pager.

## Attendance ✅
- Edit **both** check-in & check-out (admin); per-employee filter; range tabs (3w/1m/3m/custom);
  six summary stat cards (hours, deficit, extra, days worked, leaves, missing); pagination;
  employee-code column.

## Employees ✅
- Clickable grid with avatars + codes + pagination.
- Detail page: header (avatar upload, code, age, shift in AM/PM); attendance summary with range +
  stat cards + recent grid; per-employee **ShiftEditor** (AM/PM, days, buffer); super-admin
  **CompensationEditor** (dynamic categories) + base salary; full **EmployeeEditor** (all fields +
  bank for super-admin). Employee self-profile is read-only (+ own photo upload). Default avatars
  by gender.

## Leaves ✅
- Casual ≤1/month, annual ≥21-day notice (admin override), unpaid unlimited.
- Admin "add / convert leave" (missing day → casual/unpaid/paid). Employee-code columns.

## Reports ✅
- Leaves + missing-days summary cards & leaves-by-type; daily grid pagination + page size.

## Payroll 🔄 (Phase 9)
- Replace OT/commission/benefits columns with a single **Additions** column (sum of dynamic
  components) that expands to a breakdown (label, amount, description).
- **Generate monthly payslip**: copies base + recurring compensation into `payslip_components`;
  add/edit/delete lines per payslip with descriptions.
- **Paid/Pending** status per month with paid date + credited account; **payment history**
  filterable by employee + month range.
- **Printable payslip + PDF** download. Employee-code column.

## QA-driven additions ✅ (2026-06-28)
- **Add employee** UI + API (auto code/username/`Softonoma@<code>` password + login + profile +
  shift + salary + credentials). **Editable settings + holidays** (quotas drive leave math).
  **Leave hardening** (employee cancel pending, overlap guard, annual-overflow pending).
- Usernames + credentials management, deactivate enforcement, alerts-feed redesign, sidebar
  circular collapse, payslip template upgrade, real bank data, BD commission policies.

## Cross-cutting ⏳ (Phase 10 + audit)
- Repoint/extend the §14 test suite to real employees; add unit tests for new rules.
- Browser E2E (Playwright) for the critical flows.
- Production-readiness audit (see [`07-production-readiness.md`](07-production-readiness.md)).

## Decisions locked
- Real employees replace fakes (tests repointed to Muzammal Faiz as canonical subject).
- Employees get logins now (`Softonoma@123`).
- Compensation is fully dynamic (base + categories).
- Payslip = printable + PDF.
