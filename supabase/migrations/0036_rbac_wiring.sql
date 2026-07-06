-- 0036_rbac_wiring.sql — RBAC enforcement at the DB (FRD-08, slice 2).
-- Rewrites the policies/functions where the NEW roles (HR, Accounts, custom) differ from the legacy
-- enum, keying them on auth_has_perm(). Self-service own-row rules are unchanged. Grants were seeded
-- (0035) to reproduce today's behaviour exactly, so this is a key-swap, not a behaviour change — until
-- a super-admin assigns the new roles. Tables not rewritten here still key on the legacy enum, which
-- every role is bounded by via base_role (documented ceiling; migrated over time).

-- ── CRM scope helpers: access now comes from the ROLE's grants, not department/flags ───────────────
-- own-scope CRM (was: admin/super OR department='Business Development')
create or replace function auth_is_bd()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_has_perm('crm.profiles.own') or auth_has_perm('crm.leads.own');
$$;
-- all-BD scope (was: admin/super OR is_bd_lead flag)
create or replace function auth_is_bd_lead()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_has_perm('crm.profiles.all') or auth_has_perm('crm.leads.all');
$$;

-- ── payroll / compensation (Accounts works without super_admin) ───────────────────────────────────
drop policy if exists salary_super_only on salary_structures;
create policy salary_perm on salary_structures for all
  using (auth_has_perm('compensation.manage')) with check (auth_has_perm('compensation.manage'));
drop policy if exists comp_super_only on compensation_components;
create policy comp_perm on compensation_components for all
  using (auth_has_perm('compensation.manage')) with check (auth_has_perm('compensation.manage'));
drop policy if exists payroll_super_only on payroll_runs;
create policy payroll_read_perm on payroll_runs for select using (auth_has_perm('payroll.view'));
create policy payroll_write_perm on payroll_runs for insert with check (auth_has_perm('payroll.manage'));
create policy payroll_update_perm on payroll_runs for update
  using (auth_has_perm('payroll.manage')) with check (auth_has_perm('payroll.manage'));
create policy payroll_delete_perm on payroll_runs for delete using (auth_has_perm('payroll.manage'));
drop policy if exists payslip_super_only on payslip_components;
create policy payslip_read_perm on payslip_components for select using (auth_has_perm('payslips.view_all'));
create policy payslip_write_perm on payslip_components for insert with check (auth_has_perm('payroll.manage'));
create policy payslip_update_perm on payslip_components for update
  using (auth_has_perm('payroll.manage')) with check (auth_has_perm('payroll.manage'));
create policy payslip_delete_perm on payslip_components for delete using (auth_has_perm('payroll.manage'));

-- ── people ops (HR works without credentials/PII) ─────────────────────────────────────────────────
drop policy if exists emp_private_read on employee_private;
create policy emp_private_read on employee_private for select
  using (employee_id = auth.uid() or auth_has_perm('employees.private_pii'));
drop policy if exists emp_private_write on employee_private;
create policy emp_private_write on employee_private for all
  using (auth_has_perm('employees.private_pii')) with check (auth_has_perm('employees.private_pii'));
drop policy if exists emp_cred_read on employee_credentials;
create policy emp_cred_read on employee_credentials for select
  using (employee_id = auth.uid() or auth_has_perm('employees.credentials'));
drop policy if exists emp_cred_write on employee_credentials;
create policy emp_cred_write on employee_credentials for all
  using (auth_has_perm('employees.credentials')) with check (auth_has_perm('employees.credentials'));

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for insert with check (auth_has_perm('employees.manage'));
drop policy if exists profiles_admin_delete on profiles;
create policy profiles_admin_delete on profiles for delete using (auth_has_perm('employees.manage'));
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update
  using (id = auth.uid() or auth_has_perm('employees.manage'));

drop policy if exists leave_self_read on leave_requests;
create policy leave_self_read on leave_requests for select
  using (employee_id = auth.uid() or auth_has_perm('leaves.approve'));
drop policy if exists leave_self_insert on leave_requests;
create policy leave_self_insert on leave_requests for insert
  with check (employee_id = auth.uid() or auth_has_perm('leaves.approve'));
drop policy if exists leave_admin_update on leave_requests;
create policy leave_admin_update on leave_requests for update using (auth_has_perm('leaves.approve'));

drop policy if exists att_self_read on attendance;
create policy att_self_read on attendance for select
  using (employee_id = auth.uid() or auth_has_perm('attendance.view_all'));
drop policy if exists att_self_insert on attendance;
create policy att_self_insert on attendance for insert
  with check (auth_has_perm('attendance.edit_all') or (employee_id = auth.uid() and work_date = company_today()));
drop policy if exists att_update on attendance;
create policy att_update on attendance for update
  using (auth_has_perm('attendance.edit_all') or (employee_id = auth.uid() and work_date = company_today()));
drop policy if exists sessions_self_read on attendance_sessions;
create policy sessions_self_read on attendance_sessions for select
  using (employee_id = auth.uid() or auth_has_perm('attendance.view_all'));
drop policy if exists sessions_self_write on attendance_sessions;
create policy sessions_self_write on attendance_sessions for all
  using (auth_has_perm('attendance.edit_all') or (employee_id = auth.uid() and work_date = company_today()))
  with check (auth_has_perm('attendance.edit_all') or (employee_id = auth.uid() and work_date = company_today()));

drop policy if exists announcements_admin_write on announcements;
create policy announcements_admin_write on announcements for all
  using (auth_has_perm('announcements.manage')) with check (auth_has_perm('announcements.manage'));
drop policy if exists holidays_admin_write on holidays;
create policy holidays_admin_write on holidays for all
  using (auth_has_perm('holidays.manage')) with check (auth_has_perm('holidays.manage'));
drop policy if exists settings_super_write on company_settings;
create policy settings_super_write on company_settings for all
  using (auth_has_perm('settings.manage')) with check (auth_has_perm('settings.manage'));
drop policy if exists admin_notif_read on admin_notifications;
create policy admin_notif_read on admin_notifications for select using (auth_has_perm('notifications.view'));
drop policy if exists admin_notif_write on admin_notifications;
create policy admin_notif_write on admin_notifications for all
  using (auth_has_perm('notifications.view')) with check (auth_has_perm('notifications.view'));
drop policy if exists alerts_read on alerts_log;
create policy alerts_read on alerts_log for select
  using (employee_id = auth.uid() or auth_has_perm('attendance.view_all'));

-- ── activity log: financial vs ops via perms (BD own-CRM branch unchanged) ────────────────────────
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (
  auth_has_perm('activity.view_financial')
  or (auth_has_perm('activity.view_ops')
      and entity <> all (array['salary_structures','payroll_runs','compensation_components',
        'payslip_components','deals','deal_documents','receiving_accounts','employee_private',
        'employee_credentials','commission_policies']))
  or (auth_is_bd()
      and entity = any (array['dev_profiles','leads','interviews','assessments'])
      and coalesce(after->>'owner_bd_id', before->>'owner_bd_id') = auth.uid()::text)
);

-- ── CRM admin-ish bits ─────────────────────────────────────────────────────────────────────────────
drop policy if exists dev_secrets_admin on dev_profile_secrets;
create policy dev_secrets_admin on dev_profile_secrets for all
  using (auth_has_perm('crm.profiles.password')) with check (auth_has_perm('crm.profiles.password'));
drop policy if exists crm_alerts_admin_read on crm_alerts;
create policy crm_alerts_admin_read on crm_alerts for select using (auth_has_perm('notifications.view'));
drop policy if exists crm_alerts_admin_update on crm_alerts;
create policy crm_alerts_admin_update on crm_alerts for update
  using (auth_has_perm('notifications.view')) with check (auth_has_perm('notifications.view'));

-- ── deals (0030 super-only → deals.view / deals.manage; super_admin is the only default holder) ───
do $$ declare t text; begin
  foreach t in array array['deals','deal_documents','receiving_accounts'] loop
    execute format('drop policy if exists %1$s_super on %1$s;', t);
    execute format('drop policy if exists %1$s_read_perm on %1$s;', t);
    execute format('create policy %1$s_read_perm on %1$s for select using (auth_has_perm(''deals.view''));', t);
    execute format('drop policy if exists %1$s_write_perm on %1$s;', t);
    execute format($f$create policy %1$s_write_perm on %1$s for all
      using (auth_has_perm('deals.manage')) with check (auth_has_perm('deals.manage'));$f$, t);
  end loop;
end $$;
drop policy if exists payment_methods_write on payment_methods;
create policy payment_methods_write on payment_methods for all
  using (auth_has_perm('deals.manage')) with check (auth_has_perm('deals.manage'));
drop policy if exists deal_devs_super on deal_developers;
create policy deal_devs_super on deal_developers for all
  using (auth_has_perm('deals.manage')) with check (auth_has_perm('deals.manage'));
-- (deal_devs_self_read unchanged: a developer reads their own assignment rows)

-- ── definer fns keyed on perms ─────────────────────────────────────────────────────────────────────
create or replace function crm_calendar(p_from timestamptz, p_to timestamptz)
returns table(
  id uuid, interview_at timestamptz, round text, status text, outcome text,
  owner_bd_id uuid, owner_name text, stack text,
  company text, job_title text, developer text, can_expand boolean, is_mine boolean
)
language sql stable security definer set search_path = public as $$
  select
    i.id, i.interview_at, i.round, i.status, i.outcome,
    i.owner_bd_id, ownp.full_name as owner_name, ds.name as stack,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then i.company end as company,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then i.job_title end as job_title,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then coalesce(devp.full_name, gbp.full_name) end as developer,
    (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) as can_expand,
    (i.owner_bd_id = auth.uid()) as is_mine
  from interviews i
  left join profiles ownp on ownp.id = i.owner_bd_id
  left join dev_profiles dp on dp.id = i.dev_profile_id
  left join dev_stacks ds on ds.id = dp.stack_id
  left join profiles devp on devp.id = i.whom_should_give
  left join profiles gbp on gbp.id = i.given_by
  where i.interview_at is not null
    and i.interview_at >= p_from and i.interview_at < p_to
    and auth_has_perm('crm.calendar.view')
  order by i.interview_at;
$$;

create or replace function deal_directory()
returns table(deal_id uuid, deal_name text, status text, developer_id uuid, developer_name text, role text)
language sql stable security definer set search_path = public as $$
  select d.id,
         coalesce(nullif(btrim(d.name), ''), d.designation, 'Deal') as deal_name,
         d.status,
         dd.developer_id,
         p.full_name as developer_name,
         dd.role
  from deal_developers dd
  join deals d on d.id = dd.deal_id
  join profiles p on p.id = dd.developer_id
  where auth_has_perm('deals.directory')
  order by d.created_at desc, p.full_name;
$$;
