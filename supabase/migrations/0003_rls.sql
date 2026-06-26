-- 0003_rls.sql — Row Level Security (PRD §7)

-- 7.1 role helper
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- 7.2 enable RLS
alter table profiles          enable row level security;
alter table shifts            enable row level security;
alter table attendance        enable row level security;
alter table leave_requests    enable row level security;
alter table leave_balances    enable row level security;
alter table salary_structures enable row level security;
alter table payroll_runs      enable row level security;
alter table documents         enable row level security;
alter table alerts_log        enable row level security;
alter table audit_log         enable row level security;
alter table announcements     enable row level security;
alter table holidays          enable row level security;
alter table company_settings  enable row level security;

-- 7.3 profiles
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (id = auth.uid() or auth_role() in ('admin','super_admin'));

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles
  for insert with check (auth_role() in ('admin','super_admin'));
drop policy if exists profiles_admin_delete on profiles;
create policy profiles_admin_delete on profiles
  for delete using (auth_role() in ('admin','super_admin'));

-- shifts: self read, admin manage
drop policy if exists shifts_read on shifts;
create policy shifts_read on shifts
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists shifts_admin_write on shifts;
create policy shifts_admin_write on shifts
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- 7.4 attendance
drop policy if exists att_self_read on attendance;
create policy att_self_read on attendance
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists att_self_insert on attendance;
create policy att_self_insert on attendance
  for insert with check (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists att_update on attendance;
create policy att_update on attendance
  for update using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));

-- 7.5 leave requests & balances
drop policy if exists leave_self_read on leave_requests;
create policy leave_self_read on leave_requests
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists leave_self_insert on leave_requests;
create policy leave_self_insert on leave_requests
  for insert with check (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists leave_admin_update on leave_requests;
create policy leave_admin_update on leave_requests
  for update using (auth_role() in ('admin','super_admin'));

drop policy if exists bal_self_read on leave_balances;
create policy bal_self_read on leave_balances
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists bal_admin_write on leave_balances;
create policy bal_admin_write on leave_balances
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- 7.6 salary & payroll — SUPER ADMIN ONLY (admin/HR deliberately excluded)
drop policy if exists salary_super_only on salary_structures;
create policy salary_super_only on salary_structures
  for all using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

drop policy if exists payroll_super_only on payroll_runs;
create policy payroll_super_only on payroll_runs
  for all using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

-- documents: employee reads own, admin manages
drop policy if exists documents_read on documents;
create policy documents_read on documents
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists documents_admin_write on documents;
create policy documents_admin_write on documents
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- alerts_log: employee reads own, admin reads all
drop policy if exists alerts_read on alerts_log;
create policy alerts_read on alerts_log
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));

-- audit_log: admins only (§2.1 view audit log)
drop policy if exists audit_admin_read on audit_log;
create policy audit_admin_read on audit_log
  for select using (auth_role() in ('admin','super_admin'));

-- announcements: everyone reads, admin writes
drop policy if exists announcements_read on announcements;
create policy announcements_read on announcements for select using (true);
drop policy if exists announcements_admin_write on announcements;
create policy announcements_admin_write on announcements
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- holidays: everyone reads, admin writes
drop policy if exists holidays_read on holidays;
create policy holidays_read on holidays for select using (true);
drop policy if exists holidays_admin_write on holidays;
create policy holidays_admin_write on holidays
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- company_settings: everyone reads, super_admin writes (§2.1 edit settings)
drop policy if exists settings_read on company_settings;
create policy settings_read on company_settings for select using (true);
drop policy if exists settings_super_write on company_settings;
create policy settings_super_write on company_settings
  for all using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');
