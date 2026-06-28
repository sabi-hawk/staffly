-- 0008_usernames_credentials.sql — username login, managed credentials, BD commission policies.

-- username for login (employees log in with username; admins with email)
alter table profiles add column if not exists username text unique;
create index if not exists idx_profiles_username on profiles(lower(username));

-- managed portal credentials (password shown/copyable to admins; readable by self too)
create table if not exists employee_credentials (
  employee_id     uuid primary key references profiles(id) on delete cascade,
  portal_password text,
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_employee_credentials_updated on employee_credentials;
create trigger trg_employee_credentials_updated before update on employee_credentials
  for each row execute function set_updated_at();
drop trigger if exists trg_audit_employee_credentials on employee_credentials;
create trigger trg_audit_employee_credentials after insert or update or delete on employee_credentials
  for each row execute function record_audit();
alter table employee_credentials enable row level security;
drop policy if exists emp_cred_read on employee_credentials;
create policy emp_cred_read on employee_credentials
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists emp_cred_write on employee_credentials;
create policy emp_cred_write on employee_credentials
  for all using (auth_role() in ('admin','super_admin')) with check (auth_role() in ('admin','super_admin'));

-- BD commission policies (percentage-based commitments) — super-admin managed
create table if not exists commission_policies (
  id          uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  label       text not null,          -- e.g. "Own deals", "Moon's deals", "Junior deals"
  rate        numeric(5,2) not null,  -- percent
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_commission_employee on commission_policies(employee_id);
drop trigger if exists trg_audit_commission_policies on commission_policies;
create trigger trg_audit_commission_policies after insert or update or delete on commission_policies
  for each row execute function record_audit();
alter table commission_policies enable row level security;
drop policy if exists commission_super_only on commission_policies;
create policy commission_super_only on commission_policies
  for all using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- resolve a login identifier (username OR email) to the account email, pre-auth.
-- security definer so it works without exposing the profiles table to anon.
create or replace function resolve_login_email(identifier text)
returns text language sql security definer set search_path = public as $$
  select case
    when position('@' in identifier) > 0 then identifier
    else (select email from profiles where lower(username) = lower(identifier) limit 1)
  end;
$$;
grant execute on function resolve_login_email(text) to anon, authenticated;

-- tighten profiles read: authenticated users only (was using(true) — anon could enumerate).
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (auth.uid() is not null);
