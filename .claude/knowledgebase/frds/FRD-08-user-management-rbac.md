# FRD-08 — User Management & Role-Based Access Control (RBAC)

| | |
|---|---|
| **Status** | Approved (owner 2026-07-06: one role + flags; defaults as drafted reproduce today; Accounts = payroll-only; HR = no CRM/payroll/credentials; super-admin creates custom roles) |
| **Module** | User management · Access foundation (cross-cutting, supersedes the flag/enum model of FRD-05) |
| **Created** | 2026-07-06 |
| **Updated** | 2026-07-06 |
| **Plan** | — |
| **Changelog refs** | 2026-07-06 (User Management / RBAC major) |

> One place to manage people and access: a **permission catalog** covering every module built to date,
> **default roles** (each with a written reason for existing), **custom roles** creatable by the
> super-admin, and a **user-management screen** (create employee → credentials → assign role). Nav,
> routes, UI and data all key off permissions — a module is visible/usable only if the role grants it.

---

## 1. Background & context
Access today = a 3-value enum (`profiles.role`: employee/admin/super_admin) + capability flags
(`is_bd_lead`, `is_developer`, `is_deal_developer`) + the BD department. That grew organically and now
mismatches reality: "HR" and "Accounts" are different jobs squeezed into `admin`; the owner is
super-admin *and* a developer; deal-assigned devs are employees with different leave rules. ~60 RLS
policies key on `auth_role()` and helper fns; middleware gates routes; nav filters per role.

## 2. Goals & non-goals
- **Goals:** a permission catalog for everything; seeded default roles with notes/reasons; super-admin
  can create custom roles from those permissions; one screen to create/manage users end-to-end;
  visibility + access everywhere driven by permissions (nav, middleware, pages, API, and the DB for
  the sensitive areas).
- **Non-goals (v1):** per-record ACLs (owner-scoping stays as-is inside CRM); multiple simultaneous
  roles per user (capability flags cover the combos — see Q1); external SSO.

## 3. Data model
- **`permissions`** — code-defined catalog (key, module, label, description). Seeded by migration; the
  app treats keys as constants (`lib/access/permissions.ts` mirrors them).
- **`app_roles`** — id, key, name, **description**, **reason** (why this role exists — owner requirement),
  `is_system` (defaults are locked: renameable, not deletable), `base_role` (`employee|admin|super_admin`)
  = the legacy RLS ceiling this role maps to while policies migrate (see §5).
- **`role_permissions`** — role_id → permission key.
- **`profiles.app_role_id`** — the user's role (default roles backfilled from today's enum+flags).
- Existing capability flags stay as orthogonal markers (`is_developer` = assignable in pickers;
  `is_deal_developer` = client-governed leave), settable per-user alongside the role.
- **`auth_has_perm(perm text)`** — security-definer fn (user → role → role_permissions), usable by
  server code AND by RLS policies.

## 4. Permission catalog (v1 — ~44 keys, `module.action`)
**Self-service:** `dashboard.self` · `attendance.self` · `attendance.summary_self` · `leaves.self` ·
`calendar.view` · `announcements.view` · `handbook.view` · `profile.self`
**People ops:** `employees.view` · `employees.manage` · `employees.credentials` · `employees.flags` ·
`employees.private_pii` · `attendance.view_all` · `attendance.edit_all` · `leaves.approve` ·
`reports.view` · `announcements.manage` · `holidays.manage` · `activity.view_ops`
**Financial:** `payroll.view` · `payroll.manage` · `compensation.manage` · `payslips.view_all` ·
`activity.view_financial`
**CRM:** `crm.access` · `crm.profiles.own` · `crm.profiles.all` · `crm.profiles.docs` ·
`crm.profiles.password` · `crm.leads.own` · `crm.leads.all` · `crm.contacts` · `crm.calendar.view` ·
`crm.analytics.view` · `deals.view` · `deals.manage` · `deals.directory`
**Platform:** `settings.manage` · `roles.manage` · `users.assign_roles` · `product_doc.view` ·
`notifications.view`

## 5. Enforcement (defense in depth, migrated honestly)
1. **Nav + middleware + pages + API routes** check `auth_has_perm()` (replacing role/flag conditionals).
2. **RLS**: self-service policies (own-row, `employee_id = auth.uid()`) are unchanged. Policies where the
   NEW roles differ from the legacy enum are rewritten to `auth_has_perm()` in the same build — payroll/
   compensation/payslips (`payroll.*` so **Accounts** works without super_admin), employees/attendance-
   admin/leave-approval (`employees.manage` etc. so **HR** works), audit scoping. Remaining policies keep
   keying on `base_role` until migrated — every role therefore has a DB ceiling ≤ its base_role (no
   UI-only security).
3. Role assignment + custom-role management = `roles.manage`/`users.assign_roles` (super-admin by
   default); the 0019/0031 guard trigger extends to `app_role_id`.

## 6. Default roles (seeded; each stored with this reason)
| Role | Base | Reason it exists |
|---|---|---|
| **Employee** | employee | Baseline self-service: own attendance/summary, leaves, calendar, announcements, handbook, profile. |
| **Deal-assigned Developer** | employee | An engineer embedded in a client deal: leave is client-governed (balances hidden, requests record-only), sees their deal name(s). Sets `is_deal_developer`. |
| **BD** | employee | Business development: everything Employee has + CRM own-scope (profiles/leads/interviews/assessments/contacts/calendar). |
| **BD Lead** | employee | A senior BD overseeing juniors: BD + all-BD CRM scope + docs management + non-financial activity. |
| **HR** | admin | People operations without money or CRM pipelines: employees (view/manage/flags), attendance oversight, leave approvals, reports, announcements, holidays, ops activity, deal-assignments directory. **No** payroll, credentials, PII, deals. |
| **Accounts** | admin | Payroll/finance only: payroll view+manage, compensation, payslips, financial activity. **No** employee management, no CRM. |
| **Admin** | admin | Full operations = HR + employee credentials + notifications; still no payroll/deals/settings (those stay super-admin). |
| **Super Admin** | super_admin | The owners: everything incl. payroll, deals, settings, roles/users management, product doc. |

## 7. User management screens (`/admin/users`, perm-gated)
- **Users list**: name, code, role (badge), flags, status; create-employee flow (details → credentials →
  role) consolidating today's add-employee + credentials + flags cards.
- **Roles**: list default+custom roles with description/reason + permission matrix; create/edit custom
  role (pick permissions); assign role on the user detail. System roles not deletable; role changes
  audited.

## 8. Migration & backfill
Migration seeds permissions + default roles + role_permissions; backfills `app_role_id` from the current
enum/flags (admin→Admin, super_admin→Super Admin, BD dept→BD, `is_bd_lead`→BD Lead,
`is_deal_developer`→Deal-assigned Developer, else Employee). App behaviour is identical post-backfill
(defaults reproduce today's matrix) — new capability (HR/Accounts/custom roles) is opt-in.

## 9. Risks
Biggest change since the CRM build: touches nav, middleware, ~15 RLS policies, and every gated page.
Mitigations: phased slices behind identical-behaviour defaults; `base_role` DB ceiling guarantees no
role ever exceeds its legacy equivalent at the data layer; full report + RLS suite extension per slice.

## Q — Owner sign-off needed
1. **One role per user** (+ capability flags for combos like "Super Admin who is also a developer") — or
   multiple roles per user? (Recommend: one role + flags; simplest and matches how you described people.)
2. **Accounts scope** — payroll/compensation/payslips only (deals + bank receiving-accounts stay
   super-admin), or should Accounts also see deal financials? (Recommend: payroll-only.)
3. **HR vs Admin split** — HR = people ops *without* employee credentials/PII; Admin = HR + credentials +
   notifications. Both still excluded from payroll/deals/settings. Correct?
