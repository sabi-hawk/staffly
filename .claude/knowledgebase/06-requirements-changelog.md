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
  bugs/missing pieces). See [`reference/07-production-readiness.md`](reference/07-production-readiness.md).

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

## 2026-06-30 — CRM: business model + first requirements batch (Profiles, Interviews, Assessments, Leads/Deals)
Owner walked through the current Drive/Sheets-based workflow (8 screenshots) and the target CRM.
**Business model:** Softonoma is a software staffing/services business. It maintains marketable
**developer profiles** (one real person → multiple profiles, one per stack: FS/BE/FE/SEO/DE/MERN/
WordPress/Data-Eng/AI-ML…). **Business Developers (BDs, a.k.a. VDs)** apply on those profiles' behalf
to job posts across LinkedIn/Indeed/etc. Responses become **interviews** and **assessments** (tracked
today per-BD per-month in Google Sheets). When a lead clears all interviews/assessments it becomes a
**closed deal**, and the engagement details are recorded. Everything is scattered across Drive folders
+ Sheets; the owner wants it **centralized** in the portal as a business CRM. This is a large,
multi-module initiative → tracked via FRDs in [`frds/`](frds/README.md) (see `FRD-00-crm-vision.md`).

**Modules captured (each gets an FRD):**
- **Profiles** — developer profiles: stack, **owner = a BD** (or Unassigned), email, mobile, **DOB**,
  status flags (e.g. "LinkedIn banned"), and a **password that is admin/super-admin-only** (owner
  applies it on the BD's machine himself; BDs never see it). Each profile has a **primary resume +
  multiple secondary resumes** (e.g. a FS person also has FE-only, BE-only, Python resumes) + cover
  letter, stored on-platform. Admin manages profiles and **assigns profiles to BDs** (assigning =
  giving them the resume + details, minus the password). A BD sees only their assigned profiles' data.
  NOTE naming collision: the existing `profiles` table = auth user profiles; CRM developer profiles
  need a distinct name (e.g. `dev_profiles`).
- **Employee types / departments** — only **BD-department** employees can see the CRM; admin/super-
  admin see everything; other employee types cannot see it. Needs an employee-type/department concept.
- **Interviews** (per BD, was a monthly sheet) — columns: profile, lead owner (BD), job title,
  company, job post URL, status (scheduled/completed/pending), **given by** (which developer gave it),
  **whom should give** (which developer should give the next rounds — must match the first round's
  developer), interview time, date, notes, notes-2. Plus a **Round** column (rename the second
  "status" col: 1st/2nd/3rd/final round) — distinct from the scheduled/completed status.
- **Assessments** (per BD, was a sheet tab) — profile, lead owner, job title, company, status
  (completed/pending/in-progress), entry date, deadline, **completion date** (filled by developer),
  mail subject, job post URL, job description, **completed by** (developer), priority (high/med/low),
  budget, assessment link, **duration (NEW — important; e.g. 15m/30m/1h/1.5h — devs pick by duration)**,
  notes, resume/CV link, extra.
- **Leads / Deals** — a lead = the interview/assessment thread for one job/company. When all rounds
  clear, mark the deal **closed**. A closed deal records: designation, joining date, **selected
  profile**, the **developer who will work**, salary, payment method, **receiving account name**, and
  the profile's DOB; plus documents (PDFs/images/notes). **Deals are admin/super-admin ONLY** (critical
  business/financial info) — never visible to BDs or other employees.
- **Visibility & analytics** — admin sees all BDs' interviews/assessments/profiles/resumes; BD
  performance (interviews brought per BD → credibility), ongoing leads, filtering.

**Permissions summary:** BD (BD-department employee) → sees/manages only their assigned profiles'
interviews & assessments + views assigned profile data **except password**. Admin/Super-admin → all
profiles (incl. password) + all BDs' CRM data + the **Deals** workflow (admin-only). Other employees →
no CRM access. Defense in depth (middleware + RLS + UI) as per `rules/security.md`.

## 2026-07-01 — CRM: false-lead flagging (leads)
A BD may log something as a lead that later turns out **not to be a real lead** — a fake job, poor pay,
or an unpaid "collaboration". The owner wants to mark such a lead as **"Not a lead / False lead"
(disqualified)** with a **required feedback reason**, so it is **excluded from that BD's lead count /
performance analytics**. Captured in [FRD-04](frds/FRD-04-leads-deals.md) (lead qualification) and
reflected in BD analytics ([FRD-02](frds/FRD-02-interviews.md)/[FRD-05](frds/FRD-05-roles-access.md)).

## 2026-07-01 — CRM: owner/brother positioning, BD Lead role, base-pay-zero
- **Owner + brother positioning:** the two founders run the business but also act as **developers**
  assigned to interviews/assessments, while needing full access. Decision (see [FRD-05](frds/FRD-05-roles-access.md)):
  they keep a **single super-admin/admin account**, and the interview/assessment **developer picker is not
  restricted to Engineering** — it can select **any portal user flagged as a developer** (Engineering
  employees + the founder admins). Avoids dual accounts. (Confirming exact modelling with the owner.)
- **BD Lead** (new position): the owner can promote one or more BDs to **BD Lead**. A BD Lead can see the
  **leads/interviews/assessments AND deals of ALL BDs** (not just their own) — an elevated tier between BD
  and admin. Modelled via a per-employee flag (e.g. `is_bd_lead`), reflected in RLS. Scope (view-only vs
  manage; whether they see deal financials) — see [FRD-05](frds/FRD-05-roles-access.md) open questions.
- **Base pay = 0** (HR/payroll, standalone): an employee may have **base salary 0** (commission-only /
  categories-only). The add-employee + salary flows must allow a zero base without breaking payroll math.

## 2026-07-01 — BD Lead = view+manage; comprehensive Activity Log module (FRD-06)
- **BD Lead powers:** a BD Lead can **view AND manage** all BDs' CRM data (a senior editing a junior's
  lead on their behalf is allowed). Resolved in [FRD-05](frds/FRD-05-roles-access.md) Q5.
- **Activity Log / change history (big module):** the owner wants **every change across every module**
  logged and viewable in a **rich, clear** log screen — organised **per module** (e.g. Interviews,
  Assessments, Leads, Deals, Profiles, plus existing HR modules), showing **who** changed **what**, **when**,
  **using which account**, **role**, **time**, and machine info, with **human-readable field-level
  before→after** (not cryptic one-liners) and **per-record history**. Strong filtering/search. This extends
  the portal's existing audit backbone (DB `record_audit()` triggers → `audit_log` + the super-admin Logs
  panel) into a comprehensive, well-designed module → new **[FRD-06](frds/FRD-06-activity-log.md)**.

## 2026-07-02 — BD performance analytics + base-pay-zero (built)
- **BD performance analytics** (FRD-05 Q1 / FRD-02): a **`/crm/analytics` "BD Performance"** page — per-BD
  counts of active leads (disqualified excluded), disqualified, interviews, assessments, and deals
  (admin-only column). RLS-scoped: a BD sees their own numbers; admin/BD-Lead see all. Nav entry added.
- **Base pay = 0** (commission-only staff): confirmed it works end-to-end (add-employee, salary editor,
  payroll `net = base + additions − deductions` with base 0 → net = compensation; unpaid-day deduction = 0
  since daily-rate = base/working-days = 0). Made explicit in the UI (labels/help text) + a payroll unit test.

<!-- New requirements go below this line. -->

## 2026-07-04 — CRM Leads redesign: unified hub, thread model, admin alerts (FRD-07)
Owner reshaped the CRM leads experience (voice brief). Consolidated into **[FRD-07](frds/FRD-07-crm-leads-redesign.md)**; revises FRD-02/03/04's lead-status + IA + add-flow.
- **Lead = the per-company thread** (confirmed). Interviews/assessments keep linking via `lead_id`.
- **Lead status remodelled** — the old `open/interviewing/assessment/won/lost/disqualified` conflated
  *activity* with *pipeline outcome*. New set (with icons): **In Progress · On Hold · Closed** (won —
  positive) **· Rejected** (they rejected us) **· Dismissed** (we opted out — reason required; replaces
  `disqualified`). Activity state (scheduled/pending/done/passed) stays on the interview/assessment rows.
- **Feedback** free-text on **lead**, **interview**, **assessment**.
- **Dates:** *Entry* = `created_at` (system, read-only); **Received** = editable, default today
  (`interviews.received_date` new; `assessments.entry_date` reused/relabelled); *Modified* = `updated_at`.
  All three shown as grid columns.
- **One CRM Leads hub** with tabs: **Leads** (card/thread view, one card per company) · **Interviews**
  (grid) · **Assessments** (grid) — each grid with **1wk / 1mo / 3mo / custom** filters. Standalone
  Interviews & Assessments nav items removed (old routes redirect into the hub).
- **Type-first Add flow:** pick Interview/Assessment → **New company** (creates the lead) or **Existing**
  (searchable, recent-first → attaches; interview auto-advances to the next round).
- **Closed → admin alert (no deal auto-flag for now):** setting a lead `closed` raises a `crm_alerts`
  row; the admin **topbar bell** gains a red unread badge + a **last-30-days** dropdown.
- **Test/login:** seed dev_profiles for Shaiza + sample leads/activity; set `is_developer` on engineers;
  add **BD** and **Engineer** demo logins so both views are testable.

## 2026-07-05 — CRM Profiles UX polish + documents v2
- **Profiles UX (8 items):** owner filter/assign restricted to BD-Lead/admin; "Clear filters" everywhere;
  title-cased badges + shared status pill; fully clickable grid rows; instant collapsed-rail nav tooltips;
  global route-progress bar + filter pending states; Slack-formatted copy-to-clipboard on lead cards and
  interview/assessment rows.
- **Profile documents v2:** per-document notes; multiple cover letters; the owning BD can upload,
  mark-primary, annotate, and **soft-delete** their profile's documents; soft-deleted docs move to an
  **admin-only "Deleted (history)"** list (view / download / permanent hard-delete — no restore); an
  in-app **browser-native inline viewer** (eye button) for PDFs/images; dummy seed resumes + cover
  letters per demo profile. Enforced by RLS (`can_manage_dev_docs`) + a security-definer soft-delete RPC.

## 2026-07-05 — CRM lead detail + filters batch (owner feedback)
1. **Bug:** interview/assessment grid "edit" link opens the lead page, not the record's edit form
   (the lead detail page ignores the `?edit=kind:id` param). Deep-link it to auto-open that edit form.
2. **Sleeker cards + status pill:** less rounded, modern/not-bulky, on lead cards + opened lead.
3. **Grid loader:** show the loading state over the GRID being fetched, not on the filter bar — app-wide.
4. **Filter redesign (interviews/assessments/leads):** cleaner two-row layout; date presets (1wk/1mo/3mo)
   pushed to the right of a row with the custom range before them; drop the "Received" label; each
   selected dropdown shows its filter name (e.g. "Outcome: Pending"); Clear-filters = a gray circular X
   icon with a "Clear filters" tooltip. Add the same date presets to the **Leads** tab.
5. **Lead detail restructure:** clicking Edit makes the top section editable **in place** (company, role,
   profile, status, budget, expected — NOT owner, admin-only), no modal. Move **Job Description** and
   **BD Notes** out of the modal into their own editable sections **below Documents**, each explained.
6. **NEW — Lead contact details:** BDs can optionally log the company representative's contact info
   (email / phone / LinkedIn) with a type (company admin / HR / recruiter / manager / other→free text),
   for future outreach. Per-lead (`lead_contacts` table + RLS). Section explains its purpose + examples.
7. **Info icons:** a small info icon + explanatory tooltip on each CRM field (lead/interview/assessment).

### 2026-07-05 (cont.) — delivered
- Lead detail: top card edits **in place** (no modal); **Job Description** + **BD Notes** moved to their
  own editable sections below Documents; **Company contacts** section (client reps: HR/recruiter/admin/
  hiring-manager/other + email/phone/LinkedIn) via new `lead_contacts` table; **info icons** on CRM
  fields (lead/interview/assessment/contact). Edit-link bug + filter redesign + sleeker cards shipped
  earlier in the batch.

## 2026-07-05 — Login loader, dashboard/leaves privacy, attendance summary, check-in loader
1. **Login loader:** clicking a demo login (or submitting credentials) must show progress — the button
   keeps a loading state until the request resolves.
2. **Dashboard privacy:** remove the four stat cards (extra/deficit hours etc.) and the annual/casual
   leave counts from the **dashboard** (seeing "leaves left" nudges employees to take leave). Keep the
   annual-left / casual-this-month counts in the **Leaves** tab.
3. **Leave rules:** apply for Annual / Casual / Unpaid + reason. **Casual = max 1 request per month**
   (block a 2nd). Annual allowed but goes to admin for approval.
4. **Attendance summary (moved off dashboard):** worked days, leaves taken, missing hours, extra/deficit
   hours = a summary shown in the **Attendance** tab with a date-range picker (default = current month
   1st→today). **BD** can pick current month or last 3 months; **admin** can pick any range.
5. **Admin flag for the summary:** a company setting to show/hide the employee summary. **Default ON**
   (employees see it for now); admin can toggle. Admin always sees it.
6. **Check-in / check-out loader:** the check-in/out button shows a spinner while the request is in flight.

## 2026-07-05 — Daily task summary (per-employee, per-day)
- After checkout (and available all day, even before), each employee adds ONE **daily task summary**
  for the day — a rich-text editor (like the lead BD-notes editor: format text, attach links).
- **Compulsory daily** (field itself optional content, but expected every working day). If today's
  summary is missing, the employee sees a clear prompt to add it (dashboard + attendance).
- Editable/updatable **same day** (add → save → edit again). Once the day has passed: if a summary was
  added, it's **locked** (no edits). If it was missing, they may still add it the **next day(s)**, but
  a late add is **flagged as a warning** (not encouraged).
- The attendance **history grid** shows, per day, whether the summary is present/missing (+ late flag).
- **Admin** gets clear visibility of who has **not** added today's summary.
- Likely maps onto the existing `attendance.work_log` field (currently a plain "Log" column).

## 2026-07-05 — Summary polish + deal-assigned developer role + deals mgmt + product doc
### Attendance / daily-summary polish (Tier-1, build now)
1. **Late timestamp on admin:** where a summary shows "late", also show WHEN it was added (`summary_at`
   date/time) on the admin side (admin attendance grid + admin employee detail "recent days").
2. **Missing-summary intimation:** today = a clear warning ("add before you sign off"); past-missing =
   a distinct "needs to be added" warning. Added+day-passed = locked; added+not-passed = still editable.
3. **Checkout tip:** on check-out, if today's summary is still missing, prompt "Are you done? add today's
   summary." Re-show on each checkout while missing; suppress once the summary is added.
4. **Attendance range fixes:** the history grid must follow the same range as the Summary card (currently
   it shows last 30 rows regardless — they were desynced). Show the resolved date range (from→to,
   inclusive) on the summary. Add a custom range to the employee attendance page (BD capped at 3 months).

### Deal-assigned developer role + deals management (Tier-2, needs sign-off)
5. **New concept — engineering developer assigned to a DEAL.** An admin/super-admin **flag** marks an
   eng employee as deal-assigned. For them: HIDE annual/casual leave counts (their leave is governed by
   the client company they work for — admin can't approve annual in-portal, it's record-only). They can
   still submit leave requests (type + date + reason) for the record. Business rule → handbook + shown
   on their portal. Not all eng employees are deal-assigned (some just assist a lead dev → normal policy).
6. **Deals model + management (admin/super):** manage deals with name (start), designation, joining date,
   associated profile, developer(s), closer, salary/compensation, payment method, + extensible extras.
   Associate developer(s) with a deal (many-to-many: a dev on many deals, a deal with many devs; a person
   can be closer and/or developer). The associated developer sees only the deal **NAME** on their
   dashboard. **HR (admin) must not see deal financial details** — only name + assignment. Super-admin
   sees all. (Likely extends the existing `deals` table.)
7. **Product documentation page (super-admin):** a growing "product overview + roles & access" page —
   what the product is today, the roles, why they exist, the applied business rules. Update the (emptied)
   role/access doc for the new role too.

## 2026-07-06 — Richer copy-to-clipboard + User Management / RBAC (major)
1. **Copy-to-clipboard enrichment:** lead copy should include per-interview details (round, status/
   outcome, dates — done vs scheduled with its date/time) and per-assessment details, not just counts;
   interview copy should add interview date/time + entry + modified dates; same for assessments.
2. **User Management / RBAC (Tier-2, FRD):** a full user-management module. Create PERMISSIONS for every
   module built to date (dashboard, attendance, leaves, calendar, announcements, handbook, CRM areas,
   deals, payroll, reports, activity log, settings, product doc, …). Create DEFAULT ROLES (each with
   notes + the reason it exists): Employee, Deal-assigned Developer, BD, BD Lead, HR (limited admin),
   Accounts (payroll-focused), Admin, Super Admin — assign permissions to roles; assign roles to users.
   Super-admin can create CUSTOM roles. Everything (nav, routes, UI, data) must be access-driven: a
   module is visible/usable only if the role grants it. Includes employee account management (create
   user, credentials, role assignment) in one place.

## 2026-07-06 — Analytics admin-only + performance module + closed-lead masking + full reviews
1. **BD Performance → admin/super only.** Remove `crm.analytics.view` from the BD and BD Lead roles
   (RBAC regrant — demonstrates per-inner-module segregation of CRM).
2. **Rebuild the performance module** (admin/super): date range (presets + custom), bar/line charts +
   grids — leads/interviews/assessments/closed-deals per BD, activity over time.
3. **Closed leads masked from BD/BD Lead:** once a lead is `closed` (deal won), its details are only
   visible to admin/super. BDs keep only the COUNT of their closed deals (for track-keeping) — enforced
   at the DB (RLS), not just UI.
4. **Full reviews** (owner request): senior code review + QA review + product-owner review of the whole
   codebase; findings + suggestions planned accordingly.

### Review backlog (from the 2026-07-06 senior-code + product-QA reviews; criticals already fixed)
- Admin notifications need a dismiss/resolve button (they accumulate forever).
- Employee-facing notifications: in-app feed + email sends (leave decisions, announcements) via the
  existing email stub — reaches closed tabs.
- Announcements: edit/delete + pagination (currently append-only, limit 50).
- Reports CSV: include leaves/missing-days columns (on screen but not exported).
- Topbar search is a dead affordance — implement (⌘K palette) or remove.
- bdOptions() keys on the free-text department — move to RBAC truth (crm.access holders).
- lib/services/notifications.ts uses server-local dates (birthday/payslip triggers) — move to companyToday().
- Admin dashboard: parallelise its 7 sequential queries; narrow select("*").
- Typing debt: EmployeeReport.daily any[], share-text any params.
- Payroll question for owner: should MISSING days (no check-in, no leave) auto-deduct like unpaid leave?

## 2026-07-06 — Backlog approved (owner): payroll missing-day deductions + notifications + polish
1. **Missing-day payroll deduction:** days with NO attendance and NO approved leave auto-deduct (like
   unpaid leave, base/working-days per day) with a per-day justification "Missing record (date)". HR
   sees it on the payroll line, fixes the attendance/leave if wrong, regenerates → deduction clears.
2. **Employee notifications:** in-app feed (topbar bell) + emails for leave decisions; announcement
   notifications in-app.
3. Admin notifications get a dismiss; announcements get edit/delete + pagination; reports CSV gains
   leave/missing columns; topbar ⌘K search implemented; bdOptions keys on RBAC roles; notifications
   timezone + typing debt fixed.

   **Shipped 2026-07-06** (all 3 items): migrations 0039 (`employee_notifications` + definer triggers)
   + 0040 (enum-cast hotfix — leave approve/reject was failing in the trigger); payslip deductions
   column now renders the per-day justification; browser-verified end-to-end (bell badge → announcement
   fan-out, dismiss, edit/delete + pagination, ⌘K palette incl. employee search, payslip missing line).

## 2026-07-06 — Sessions must last all day + sidebar IA simplification (owner)
1. **Sessions:** a BD works in the portal all day (leads back and forth) — sessions must be very long,
   refresh tokens must genuinely work, and an idle user coming back should resume seamlessly
   (automatic is fine). Owner asked what the current strategy + session length is.
2. **Sidebar IA:** super admin sees too many flat items (~16). Group like the CRM parent menu:
   attendance+leaves together; calendar/reports(/activity-log?) together; employees+roles = user
   management; handbook+product doc = documents; profile+settings somewhere common; announcements,
   payroll, CRM stay separate. Target ≤10 top-level items; final grouping is my call ("it's up to
   you… analyze and decide"), tabs-on-one-screen also acceptable where a parent menu is overkill.

## 2026-07-06 — Roles page polish (owner)
Deal-assigned Developer's edit button wrapped below the card text (long reason + flex-wrap) — pin
actions top-right on all cards. And the roles that auto-set a capability flag on assignment
(BD Lead → is_bd_lead, Deal-assigned Developer → is_deal_developer) must show a coloured flag chip
on the card with a hover tooltip explaining the flag. **Shipped same day.**

## 2026-07-06 — Company settings cleanup + holiday audiences (owner)
1. Company name not editable (branding fixed). 2. Leave quotas stay. 3. Explain check-in buffer /
missed-checkout grace / overtime warning — the latter renamed to "Still checked-in alert" since it's
an admin heads-up about forgotten checkouts, never a warning to the employee. 4. Info icons (ⓘ +
hover tooltip) on settings fields — platform-wide pattern, CRM already has it. 5. Holidays move from
Settings to the Announcements page, with an option to announce a holiday from there. 6. **Holiday
audiences**: a holiday targets Everyone or specific teams (multi-select covers "everyone except X"),
plus an explicit "also applies to deal-assigned developers" control — outside the audience the date
stays a normal working day (attendance, leave counts, payroll missing-day checks all follow).
**Shipped same day** (migration 0041).

## 2026-07-06 — Merge the two open-checkout alerts + rename nav "Company settings" → "Configuration" (owner)
Missed-checkout grace and the still-checked-in alert fired on the same condition an hour apart
(duplicate admin-feed noise, two confusing knobs). Merged into ONE setting — "Missed checkout: alert
after (h)" — at which the employee gets the reminder email and admins get one feed alert (0042 drops
`overtime_warning_hours`; the alert_type enum keeps the legacy value for history). Under the Settings
nav group, "Company settings" is renamed **Configuration**. **Shipped same day.**
