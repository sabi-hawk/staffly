-- 0060_profile_password_access_role_docs.sql
--  1) Profile account passwords must be hidden from BDs and the BD-Lead (owner rule 2026-07-15).
--     Previously `dev_secrets_owner_read` let the BD-Lead read all, and a BD read the secret of profiles
--     they own. Drop that — now only `crm.profiles.password` holders (super-admin, and Partner (BD) as
--     the trusted exception) may read a profile's password.
--  2) Grant `crm.profiles.password` to partner_bd (the trusted BD-partner exception).
--  3) Enrich the system roles' descriptions so the Roles page explains, per role, what it does, what it
--     hides, and the benefit.

drop policy if exists dev_secrets_owner_read on dev_profile_secrets;

insert into role_permissions (role_id, permission_key)
select r.id, 'crm.profiles.password' from app_roles r
where r.key = 'partner_bd'
on conflict do nothing;

-- ── richer role descriptions (shown on People → Roles) ────────────────────────────────────────────
update app_roles set description = 'The founders'' full-control seat. Sees and manages everything: payroll and salaries, deal financials, all reports and audit (including login events and PII), company settings, and Roles & user management. Nothing is hidden. Kept as a dedicated separate login so everyday work happens under a limited role and this powerful account stays locked away.' where key = 'super_admin';
update app_roles set description = 'Full HR / operations without the money. Manages employees, attendance, leave approvals, announcements, reports, and employee login credentials. Hidden: payroll / salary / compensation, deal financials, login-event audit, and CNIC / bank PII — so operations run without exposing finances or sensitive identity data.' where key = 'admin';
update app_roles set description = 'People operations (limited). Manages employees, attendance oversight, leave approvals, and reports — the day-to-day HR work. Hidden: payroll / finance, deals, credentials, and PII. Benefit: HR gets what it needs without any financial or highly sensitive access.' where key = 'hr';
update app_roles set description = 'The finance seat without full admin. Handles payroll, compensation, and payslips. Benefit: a finance person can run payroll without holding admin power over people or the CRM.' where key = 'accounts';
update app_roles set description = 'The baseline self-service account every hire gets. Own dashboard, attendance (check-in/out), leaves, calendar, announcements, handbook, and profile. Sees only their own data — nothing about other people, the CRM, or money.' where key = 'employee';
update app_roles set description = 'A business-development executive. Runs their OWN pipeline: their dev-profiles, leads, interviews and assessments (owner-scoped). Hidden: other BDs'' data, deals / financials, payroll, and profile account passwords. Benefit: a BD focuses on their own book without seeing the wider business or sensitive secrets.' where key = 'bd';
update app_roles set description = 'A senior BD who oversees the whole team. Everything a BD has, but across ALL BDs'' CRM data — to review and fix juniors'' work. Still hidden: deals / financials, payroll, and profile account passwords.' where key = 'bd_lead';
update app_roles set description = 'An engineer embedded in a client deal. Their leave is governed by the client company, so our annual/casual balances are hidden and leave is record-only (logged, admin-confirmed). Sees the deal NAME they are on, never its financials.' where key = 'deal_developer';
update app_roles set description = 'A founding developer-partner (Ali, Sabahat). Full CRM visibility across all BDs plus the power to delete/restore CRM records — but deliberately WITHOUT super-admin, so a session left open never exposes deals, payroll, or settings. No check-in / leave duties. Benefit: partners run the CRM safely without holding the keys to the finances.' where key = 'partner_dev';
update app_roles set description = 'A founding BD-partner (Mohiudin). Full BD-Lead reach across all BDs'' pipeline plus record delete/restore, and — as a trusted partner — CAN see profile account passwords. No check-in / leave / finance / deals / settings. Benefit: a partner-level BD runs the whole pipeline with the extra trust of password access, without super-admin risk.' where key = 'partner_bd';
