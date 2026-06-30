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
  restricted to **super admin** (so salary changes stay private). See `../database/database.md`.

## 2026-06-28 — QA round 2 (usernames/credentials, BD commissions, data cleanup, UX)
- **Alerts feed badges** look broken (type chip wraps) — redesign cleanly.
- **Employment type**: only **Shaiza Maheen = remote**; everyone else **onsite** (remote count → 1).
- **Dashboard + Employees list** must show **only role=employee** (hide Founder Admin / Hira HR).
  Keep the admin/super-admin accounts but never list them as employees.
- **Usernames** for all employees, `first.last` lowercase: shaiza.maheen, ahmad.roshan,
  fatima.sultan, areeba.zaidi, aizaz.ansab, muzammil.faiz, hamza.ilyas. Complete Areeba's name
  to **Areeba Zaidi**.
- **Login by username OR email.** Employees log in with username; the two admin accounts use
  emails: **super.admin@softonoma.com** (super_admin) and **admin@softonoma.com** (admin).
- **Passwords**: employees = `Softonoma@<employee_code>`. Admin accounts = `Softonoma@<random>`
  (strong). Admin/super-admin can **edit username + reset password** from the employee panel.
- **Credentials visible** in the employee panel (username + password) with a **Copy** button that
  copies a formatted block ("Login credentials for <name> — Username: … Password: …"), and editable.
- **Deactivate employee**: a status toggle (active/inactive); inactive users **cannot log in**
  but their records remain.
- **Back button** on inner screens (employee detail, payslip, etc.).
- **Sidebar collapse**: the expand control gets cut off — use a circular arrow straddling the
  sidebar's right edge, fixed mid-height, visible collapsed or expanded.
- **Remove fake data**: I invented bank account/title/bank/IBAN, DOB, and some compensation
  categories — none of that was provided. Keep only what the sheet has (name, designation,
  joining date, phone, emails, CNIC, salary, commissions/extra-hours). Empty the rest.
- **BD commissions** (sheet col K) as a per-employee commission policy (BD dept only):
  Shaiza 4% own + 2% on Moon's deals; Ahmad 3% own + 1% juniors; Fatima 2% own; Areeba 2% own.
  Engineers' conditional bonuses (Aizaz "50,000 (invesp)", Muzammil "50,000 if 4 extra hrs/day")
  recorded as non-recurring compensation notes; Hamza none.

## 2026-06-28 — QA-driven additions (owner-approved)
A professional-QA subagent reviewed the whole flow vs intent. Owner approved building:
- **Add-employee flow** (`/admin/employees/new` + `POST /api/admin/employees`): admin onboards a
  hire — auto-generates 4-digit code, `first.last` username, `Softonoma@<code>` password, and
  creates the auth login + profile + default shift + base salary + leave balance + credentials.
- **Editable company settings + holidays** (super admin); leave quotas now read from
  `company_settings` (annual/casual) and holidays drive working-day math.
- **Leave hardening**: employees can **cancel** their own pending request
  (`/api/leaves/[id]/cancel`); overlapping leave ranges are blocked; annual-overflow unpaid part
  is now **pending** (decided with the annual part, not auto-approved). Missing-day self-logging
  is via the apply form (past dates allowed).
- Small QA fixes: employee can edit today's checkout after checking out; demo-login buttons are
  dev-only; deactivated users see an "account deactivated" message on login.
- Deferred (owner): employee self-service password change (kept admin-only).

## 2026-06-28 — QA round 3 (BambooHR-style attendance, leave accrual, probation, alerts)
- **Multi-session check-in/out (breaks)**: an employee can check in/out multiple times a day;
  the dashboard timer resumes and accumulates; day total = sum of checked-in sessions; final
  checkout ends the day. (Replaces single check-in/out per day.)
- **Employee dashboard**: BambooHR-style top block with the live running timer + check-in/out;
  show available holidays, annual leaves available, casual available this month.
- **Casual leave**: 1 per month, **use-it-or-lose-it** (no carry-forward); resets monthly.
  (Supersedes the earlier "2/month".)  [confirm]
- **Annual leave (post-probation)**: accrues **1 per month up to 8**, **carried forward within
  the calendar year**, resets on Jan 1.  [confirm — was "8 granted up front"]
- **Probation vs permanent** contract flag on employees. Probation = **0 annual**, **1 casual
  per 3 months**, everything else unpaid. Probation length 3 months from joining date.
  Set Ahmad Roshan, Areeba Zaidi, Fatima Sultan = probation.  [confirm]
- **Admin alerts/notifications module** (shown to admin/super-admin): probation-period-ended
  (review for permanent), and a **payslip-compilation reminder around the 25th–26th** each month.
- **Shared calendar** (all roles): admin marks public/national/company holidays; everyone sees
  holidays + who is on approved leave on each day (availability).
- **Birthday alerts** (super-admin) based on DOB — upcoming birthdays surfaced in advance.
- **Announcements board**: admin/super-admin post announcements; all employees see them.
- **Test employee account** for the owner to explore the employee view (added to CREDENTIALS.md).
- **Employee handbook** (nav item, all roles): current company policies — leave types & quotas,
  probation rules, unpaid leave, annual accrual/carry, casual no-carry, attendance, payroll.
  Living document; seed with current business rules.

## 2026-06-30 — CRM expansion kickoff (workflow: FRDs)
The portal is expanding from an HR/attendance/payroll app into a **business CRM** to manage
Softonoma's business data. This is a large, multi-module initiative, so the workflow now uses
**FRDs** (Functional Requirements Documents) as the maturing stage between this changelog and plans:
incremental instructions are logged here, then consolidated into a per-module FRD in
[`frds/`](frds/README.md) (Draft → In Review → Approved → Promoted), and only an **Approved** FRD is
promoted to a `plans/` plan and built. Created `frds/` (README + template) and `FRD-00-crm-vision.md`
(umbrella/module map). CRM module requirements will be appended below and folded into their FRDs.

<!-- New requirements go below this line. -->
