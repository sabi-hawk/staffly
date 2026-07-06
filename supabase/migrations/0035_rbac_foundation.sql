-- 0035_rbac_foundation.sql — User Management / RBAC foundation (FRD-08, slice 1: purely additive).
-- A permission catalog + seeded default roles (with a written reason each) + role→permission grants +
-- profiles.app_role_id (backfilled from the legacy enum/flags) + auth_has_perm(). No behaviour changes
-- yet — enforcement wiring (nav/middleware/pages/RLS) lands in the next slice. base_role keeps every
-- role bounded by its legacy RLS ceiling until policies migrate (no UI-only security).

-- ── catalog ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists permissions (
  key         text primary key,          -- e.g. 'payroll.manage'
  module      text not null,             -- grouping for the roles UI
  label       text not null,
  description text
);

create table if not exists app_roles (
  id          uuid primary key default uuid_generate_v4(),
  key         text unique not null,
  name        text not null,
  description text,
  reason      text,                      -- why this role exists (owner requirement)
  is_system   boolean not null default false,  -- defaults: editable grants, not deletable
  base_role   user_role not null default 'employee', -- legacy RLS ceiling while policies migrate
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_app_roles_updated before update on app_roles for each row execute function set_updated_at();
create trigger trg_audit_app_roles after insert or update or delete on app_roles for each row execute function record_audit();

create table if not exists role_permissions (
  role_id        uuid not null references app_roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);
create trigger trg_audit_role_permissions after insert or delete on role_permissions for each row execute function record_audit();

alter table profiles add column if not exists app_role_id uuid references app_roles(id);

-- ── RLS ────────────────────────────────────────────────────────────────────────────────────────────
alter table permissions enable row level security;
alter table app_roles enable row level security;
alter table role_permissions enable row level security;
-- the catalog + role definitions are harmless metadata: readable by any signed-in user (the UI shows
-- role names/badges); writes need roles.manage (super-admin by default). Seeds use service-role.
drop policy if exists permissions_read on permissions;
create policy permissions_read on permissions for select using (auth.uid() is not null);
drop policy if exists app_roles_read on app_roles;
create policy app_roles_read on app_roles for select using (auth.uid() is not null);
drop policy if exists role_permissions_read on role_permissions;
create policy role_permissions_read on role_permissions for select using (auth.uid() is not null);

-- ── auth_has_perm ─────────────────────────────────────────────────────────────────────────────────
create or replace function auth_has_perm(p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join role_permissions rp on rp.role_id = p.app_role_id
    where p.id = auth.uid() and rp.permission_key = p_perm
  );
$$;
revoke all on function auth_has_perm(text) from public;
grant execute on function auth_has_perm(text) to authenticated;

-- write policies (defined after auth_has_perm exists)
drop policy if exists permissions_write on permissions;
create policy permissions_write on permissions for all
  using (auth_has_perm('roles.manage')) with check (auth_has_perm('roles.manage'));
drop policy if exists app_roles_write on app_roles;
create policy app_roles_write on app_roles for all
  using (auth_has_perm('roles.manage')) with check (auth_has_perm('roles.manage'));
drop policy if exists role_permissions_write on role_permissions;
create policy role_permissions_write on role_permissions for all
  using (auth_has_perm('roles.manage')) with check (auth_has_perm('roles.manage'));

-- ── seed: permissions (idempotent upsert) ─────────────────────────────────────────────────────────
insert into permissions (key, module, label, description) values
  ('dashboard.self','Self-service','Dashboard','Own dashboard (check-in widget, recent days, holidays).'),
  ('attendance.self','Self-service','Attendance (own)','Check in/out, own history, daily task summary.'),
  ('attendance.summary_self','Self-service','Attendance summary (own)','Own worked-days/leaves/missing/extra-deficit summary (also gated by the company setting).'),
  ('leaves.self','Self-service','Leaves (own)','Apply for leave, see own requests/balances.'),
  ('calendar.view','Self-service','Company calendar','Holidays + who is on approved leave.'),
  ('announcements.view','Self-service','Announcements (view)','Read company announcements.'),
  ('handbook.view','Self-service','Handbook','Read the employee handbook.'),
  ('profile.self','Self-service','Own profile','View/edit own profile + avatar.'),
  ('employees.view','People ops','Employees (view)','Employee list + detail (no credentials/PII).'),
  ('employees.manage','People ops','Employees (manage)','Add/edit employees, shifts, status.'),
  ('employees.credentials','People ops','Employee credentials','View/reset portal login credentials.'),
  ('employees.flags','People ops','Roles & flags','Set developer / BD-lead / deal-assigned flags.'),
  ('employees.private_pii','People ops','Private PII','CNIC / bank details (employee_private).'),
  ('attendance.view_all','People ops','Attendance (all)','Attendance oversight across employees.'),
  ('attendance.edit_all','People ops','Attendance (edit)','Correct any employee''s attendance.'),
  ('leaves.approve','People ops','Leave approvals','Approve/reject leave requests.'),
  ('reports.view','People ops','Reports','Attendance/leave reports.'),
  ('announcements.manage','People ops','Announcements (manage)','Create/edit announcements.'),
  ('holidays.manage','People ops','Holidays','Manage the holiday calendar.'),
  ('activity.view_ops','People ops','Activity log (ops)','Non-financial audit entries.'),
  ('payroll.view','Financial','Payroll (view)','View payroll runs + payslips.'),
  ('payroll.manage','Financial','Payroll (manage)','Generate/finalise payroll runs.'),
  ('compensation.manage','Financial','Compensation','Salary structures + compensation components.'),
  ('payslips.view_all','Financial','Payslips (all)','Every employee''s payslips.'),
  ('activity.view_financial','Financial','Activity log (financial)','Financial/PII audit entries.'),
  ('crm.access','CRM','CRM access','Enter the CRM area at all.'),
  ('crm.profiles.own','CRM','Profiles (own)','Dev-profiles assigned to me.'),
  ('crm.profiles.all','CRM','Profiles (all)','Every BD''s dev-profiles.'),
  ('crm.profiles.docs','CRM','Profile documents','Manage resumes/cover letters on accessible profiles.'),
  ('crm.profiles.password','CRM','Profile passwords','Reveal/set dev-profile account passwords.'),
  ('crm.leads.own','CRM','Leads (own)','My leads / interviews / assessments.'),
  ('crm.leads.all','CRM','Leads (all)','Every BD''s leads / interviews / assessments.'),
  ('crm.contacts','CRM','Company contacts','Log client-side contacts on accessible leads.'),
  ('crm.calendar.view','CRM','Interview calendar','The shared interview calendar.'),
  ('crm.analytics.view','CRM','BD performance','BD analytics.'),
  ('deals.view','CRM','Deals (view)','Deal details incl. financials.'),
  ('deals.manage','CRM','Deals (manage)','Create/edit deals, assignments, accounts/methods.'),
  ('deals.directory','CRM','Deal assignments (names)','Which developer is on which deal — names only.'),
  ('settings.manage','Platform','Company settings','Quotas, buffers, feature flags.'),
  ('roles.manage','Platform','Roles & permissions','Create/edit roles and their grants.'),
  ('users.assign_roles','Platform','Assign roles','Change a user''s role.'),
  ('product_doc.view','Platform','Product documentation','The living product/roles doc.'),
  ('notifications.view','Platform','Admin notifications','Probation/payslip/birthday notifications.')
on conflict (key) do update set module = excluded.module, label = excluded.label, description = excluded.description;

-- ── seed: default roles ───────────────────────────────────────────────────────────────────────────
insert into app_roles (key, name, description, reason, is_system, base_role) values
  ('employee','Employee','Baseline self-service staff account.','Every hire needs attendance, leaves, calendar, announcements, handbook and their own profile — nothing more by default.', true, 'employee'),
  ('deal_developer','Deal-assigned Developer','An engineer embedded in a client deal.','Their leave is governed by the client company (balances hidden, requests record-only) and they see their deal name(s); created so client-deal engineers aren''t forced through our internal leave policy.', true, 'employee'),
  ('bd','BD','Business development executive.','BDs run their own pipeline (profiles, leads, interviews, assessments, contacts, shared calendar) without seeing colleagues'' pipelines or any financials.', true, 'employee'),
  ('bd_lead','BD Lead','Senior BD overseeing the team.','A senior must review/fix juniors'' CRM work, so this extends BD with all-BD scope + ops activity — still no financials.', true, 'employee'),
  ('hr','HR','People operations (limited).','HR manages people (employees, attendance oversight, leave approvals, reports, announcements) but must not see money, CRM pipelines, credentials or private PII.', true, 'admin'),
  ('accounts','Accounts','Payroll & finance.','A finance person needs payroll/compensation/payslips without holding people-management or CRM power — payroll should not require full super-admin.', true, 'admin'),
  ('admin','Admin','Full operations.','The trusted operations seat: everything HR has plus employee credentials, CRM oversight and notifications — still excluded from payroll, deals and settings.', true, 'admin'),
  ('super_admin','Super Admin','The founders / owners.','Unrestricted: payroll, deals, settings, roles & user management, product documentation. The accountability stops here.', true, 'super_admin')
on conflict (key) do update set name = excluded.name, description = excluded.description, reason = excluded.reason, base_role = excluded.base_role;

-- ── seed: role → permission grants (replace-all per system role, so re-running self-heals) ────────
do $$
declare
  self_service text[] := array['dashboard.self','attendance.self','attendance.summary_self','leaves.self','calendar.view','announcements.view','handbook.view','profile.self'];
  bd_own text[] := array['crm.access','crm.profiles.own','crm.profiles.docs','crm.leads.own','crm.contacts','crm.calendar.view','crm.analytics.view'];
  hr_ops text[] := array['employees.view','employees.manage','employees.flags','attendance.view_all','attendance.edit_all','leaves.approve','reports.view','announcements.manage','holidays.manage','activity.view_ops','deals.directory'];
  r record;
  grants text[];
begin
  for r in select id, key from app_roles where is_system loop
    grants := self_service; -- every default role includes self-service
    if r.key = 'bd' then grants := grants || bd_own; end if;
    if r.key = 'bd_lead' then grants := grants || bd_own || array['crm.profiles.all','crm.leads.all','activity.view_ops']; end if;
    if r.key = 'hr' then grants := grants || hr_ops; end if;
    if r.key = 'accounts' then grants := grants || array['payroll.view','payroll.manage','compensation.manage','payslips.view_all','activity.view_financial','reports.view']; end if;
    if r.key = 'admin' then grants := grants || hr_ops || array['employees.credentials','notifications.view'] || bd_own || array['crm.profiles.all','crm.profiles.password','crm.leads.all']; end if;
    if r.key = 'super_admin' then select array_agg(key) into grants from permissions; end if;
    delete from role_permissions where role_id = r.id;
    insert into role_permissions (role_id, permission_key) select r.id, unnest(grants) on conflict do nothing;
  end loop;
end $$;

-- ── backfill profiles.app_role_id from the legacy enum + flags (precedence order) ────────────────
update profiles set app_role_id = (select id from app_roles where key='super_admin') where role = 'super_admin' and app_role_id is null;
update profiles set app_role_id = (select id from app_roles where key='admin') where role = 'admin' and app_role_id is null;
update profiles set app_role_id = (select id from app_roles where key='bd_lead') where role = 'employee' and is_bd_lead and app_role_id is null;
update profiles set app_role_id = (select id from app_roles where key='bd') where role = 'employee' and department = 'Business Development' and app_role_id is null;
update profiles set app_role_id = (select id from app_roles where key='deal_developer') where role = 'employee' and is_deal_developer and app_role_id is null;
update profiles set app_role_id = (select id from app_roles where key='employee') where app_role_id is null;

-- new signups default to the Employee role (elevation is a deliberate super-admin action)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role, app_role_id)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name','New Employee'),
          new.email,
          'employee',
          (select id from app_roles where key = 'employee'))
  on conflict (id) do nothing;
  return new;
end; $$;

-- ── guard: app_role_id changes are as privileged as `role` changes ────────────────────────────────
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(auth_role(), 'employee');
begin
  if auth.uid() is null then
    return NEW; -- service-role (seed / admin API / cron) — trusted
  end if;

  if v_role not in ('admin','super_admin') then
    if NEW.role              is distinct from OLD.role
    or NEW.status            is distinct from OLD.status
    or NEW.department         is distinct from OLD.department
    or NEW.department_id      is distinct from OLD.department_id
    or NEW.is_bd_lead        is distinct from OLD.is_bd_lead
    or NEW.is_developer      is distinct from OLD.is_developer
    or NEW.is_deal_developer is distinct from OLD.is_deal_developer
    or NEW.app_role_id       is distinct from OLD.app_role_id then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;

  -- role AND app-role assignment are super-admin-level actions (users.assign_roles later widens this)
  if v_role <> 'super_admin' and NEW.role is distinct from OLD.role then
    raise exception 'Only a super-admin can change a role';
  end if;
  if v_role <> 'super_admin' and NEW.app_role_id is distinct from OLD.app_role_id then
    raise exception 'Only a super-admin can assign roles';
  end if;

  return NEW;
end $$;
