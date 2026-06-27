# 06 — Requirements Changelog

Chronological log of requirements from the owner. **Append a dated entry whenever a new
requirement arrives, before implementing.** Never rewrite history — supersede with a new entry.

---

## 2026-06-26 — Initial build (v1, "Staffly")
Source: `source/Staffly_PRD_v2.1.docx`. Full HR portal: attendance, shifts, leave, hours
analytics, work logs, profiles, payroll; Next.js 14 + Supabase + RLS; self-testing protocol §14.
Delivered and cloud-verified.

## 2026-06-27 — v2 Softonoma QA overhaul
Owner QA feedback (logged in as super admin). Implemented across phases 1–9:
- **Branding/theme**: use Softonoma logo + icon (not "Staffly S"); rename to "Softonoma Employee
  Portal"; **light** modern theme (sidebar not dark).
- **Dashboard**: fix broken Alerts-feed UI.
- **Attendance**: edit **both** check-in & check-out; employee **code** column; per-employee view
  with date-range tabs (3 weeks/1 month/3 months/custom) + summary stat cards (total/missing/
  working hours, leaves); **pagination**; seed ~1–3 months of attendance for realistic testing.
- **Employees**: clearer clickable rows; **pagination** (incl. API); richer detail (name,
  designation, joining date, phone, two emails, CNIC, base salary); **dynamic compensation
  categories** (label + amount + description, recurring or one-off) replacing rigid OT/commission;
  feed the **7 real employees**; attendance summary with date range (default current month);
  **bank/account details** (number, title, bank, IBAN) for super admin; per-employee **shift**
  inside the employee tab (remove standalone Shifts page) shown in **AM/PM**; employees **cannot
  edit** their own details (admin does) but may upload their **photo**; default male/female avatars.
- **Leaves**: employee code column; **casual ≤2/month**, **annual 8/yr + ≥3 weeks notice**
  validations; **unpaid** option; convert a **missing day** into a leave (admin or employee).
- **Reports**: show leaves/missing days; **pagination + page size** (default 10; allow 100/200/300).
- **Payroll**: employee code; **dynamic additions** as one expandable column (with breakdown +
  descriptions); **monthly payslip** generation (editable lines); **paid/pending** status per
  month; **payment history** (date credited, amount, account) filterable by employee + months;
  **printable + PDF** payslip.
- **Employee accounts**: account number, title, bank, IBAN (for crediting salaries).
- Add **date of birth** + computed **age**.

## 2026-06-27 — Process & production readiness
- Maintain an extensive `CLAUDE.md` and this **knowledge base**; agents must read the KB and keep
  it updated. Define an **autonomous workflow** where Claude owns development + testing +
  validation (subagents) + browser testing, makes sensible decisions when unspecified, and needs
  minimal owner involvement.
- **Going live in a few days** → every change must leave the app **production-ready** (no known
  bugs/missing pieces). See [`07-production-readiness.md`](07-production-readiness.md).

## 2026-06-27 — Comprehensive audit logging + super-admin Logs panel
Every edit on the platform must be logged and viewable by the super admin:
- Capture **all** mutations — salary/base changes, compensation category changes, attendance
  (check-in/check-out/edits), leave changes — by **anyone** (employee, admin, super admin).
- A **Logs panel** (super admin) showing: who made the change, when (date/time), what changed,
  **previous value vs new value**, the account used, and as much **machine info** as obtainable
  (IP address, user agent / device; note: a browser cannot read a real MAC address — capture
  IP + user-agent at login instead). Detailed + filterable + paginated.
- Design: DB-level audit triggers on sensitive tables for guaranteed before/after capture
  regardless of write path; a `login_events` table for IP/user-agent at sign-in; audit visibility
  restricted to **super admin** (so salary changes stay private). See `02-data-model.md`.

<!-- New requirements go below this line. -->
