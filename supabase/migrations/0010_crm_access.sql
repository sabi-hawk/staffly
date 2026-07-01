-- 0010_crm_access.sql — CRM access foundation (FRD-05).
-- Departments lookup + person flags (is_bd_lead, is_developer) + BD access helpers, so only
-- Business-Development employees (and admins/super-admins, and BD Leads) can reach the CRM.

-- ── Departments lookup ────────────────────────────────────────────────────────
create table if not exists departments (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed the canonical departments (mirror the existing free-text values in profiles/seed).
insert into departments (name, sort_order) values
  ('Business Development', 1),
  ('Engineering',          2),
  ('Design',               3),
  ('QA',                   4),
  ('People',               5),
  ('Exec',                 6)
on conflict (name) do nothing;

drop trigger if exists trg_departments_updated on departments;
create trigger trg_departments_updated before update on departments
  for each row execute function set_updated_at();

-- ── profiles: department FK + CRM person flags ────────────────────────────────
alter table profiles add column if not exists department_id uuid references departments(id);
alter table profiles add column if not exists is_bd_lead   boolean not null default false;
alter table profiles add column if not exists is_developer boolean not null default false;
create index if not exists idx_profiles_department on profiles(department_id);

-- Backfill department_id from the legacy free-text department (case-insensitive, trimmed).
-- The text column is kept for now to avoid breaking the employee editor mid-migration.
update profiles p
   set department_id = d.id
  from departments d
 where p.department_id is null
   and p.department is not null
   and lower(trim(p.department)) = lower(d.name);

-- ── Guard: non-admins may NOT change privileged columns on their own profile ──
-- The existing profiles_self_update policy has no column check (employees self-update their avatar).
-- This trigger closes the escalation hole: a non-admin actor cannot change role/status/department/
-- CRM flags. Service-role writes (auth.uid() is null: seed/cron/admin API) and admin/super-admin
-- actors are allowed.
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(auth_role(), 'employee') not in ('admin','super_admin') then
    if NEW.role         is distinct from OLD.role
    or NEW.status       is distinct from OLD.status
    or NEW.department_id is distinct from OLD.department_id
    or NEW.is_bd_lead   is distinct from OLD.is_bd_lead
    or NEW.is_developer is distinct from OLD.is_developer then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_profile_cols on profiles;
create trigger trg_guard_profile_cols before update on profiles
  for each row execute function guard_profile_privileged_cols();

-- ── Access helpers (security-definer, like auth_role()) ───────────────────────
create or replace function auth_department()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid();
$$;

-- BD-or-admin: can reach the CRM at all.
-- NOTE: keyed on the text `department` (the value the seed + employee editor maintain) so all three
-- access layers (middleware, nav, RLS) read ONE consistent source and never drift. The `departments`
-- lookup + `department_id` are introduced here as forward structure; a follow-up will wire the employee
-- editor + seed to write `department_id` and then flip this helper to the FK join. (FRD-05 Q2.)
create or replace function auth_is_bd()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_role() in ('admin','super_admin')
      or exists (
        select 1 from profiles
        where id = auth.uid() and department = 'Business Development'
      );
$$;

-- BD Lead (or admin): elevated cross-BD visibility.
create or replace function auth_is_bd_lead()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_role() in ('admin','super_admin')
      or exists (select 1 from profiles where id = auth.uid() and is_bd_lead = true);
$$;

-- ── RLS: departments (lookup — everyone reads, admin/super writes) ────────────
alter table departments enable row level security;
drop policy if exists departments_read on departments;
create policy departments_read on departments for select using (true);
drop policy if exists departments_admin_write on departments;
create policy departments_admin_write on departments
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- Audit the departments lookup (consistent with other sensitive tables).
drop trigger if exists trg_audit_departments on departments;
create trigger trg_audit_departments after insert or update or delete on departments
  for each row execute function record_audit();
