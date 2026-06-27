-- 0006_audit.sql — comprehensive change auditing + login activity.
-- A generic AFTER trigger records every human (auth.uid() present) INSERT/UPDATE/DELETE on the
-- sensitive tables into audit_log with before/after snapshots + actor identity. Service-role
-- writes (seed, cron) are skipped to keep the panel clean.

alter table audit_log add column if not exists actor_email text;
alter table audit_log add column if not exists actor_role  text;
alter table audit_log add column if not exists ip_address  text;
alter table audit_log add column if not exists user_agent  text;
create index if not exists idx_audit_created on audit_log(created_at desc);
create index if not exists idx_audit_entity on audit_log(entity);

create or replace function record_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_role  user_role;
  v_id    uuid;
begin
  if v_actor is null then
    return coalesce(NEW, OLD);  -- skip system / seed / cron (service-role) writes
  end if;
  select email, role into v_email, v_role from profiles where id = v_actor;
  v_id := coalesce((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid);
  insert into audit_log (actor_id, actor_email, actor_role, action, entity, entity_id, before, after)
  values (
    v_actor, v_email, v_role::text, lower(TG_OP), TG_TABLE_NAME, v_id,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(NEW) end
  );
  return coalesce(NEW, OLD);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','attendance','leave_requests','leave_balances','shifts',
    'salary_structures','compensation_components','payroll_runs','payslip_components'
  ] loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on %1$s
       for each row execute function record_audit();', t);
  end loop;
end $$;

-- login activity (IP + user agent captured at sign-in by /api/audit/login)
create table if not exists login_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,
  email text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_events_created on login_events(created_at desc);
alter table login_events enable row level security;

-- audit visibility: SUPER ADMIN ONLY (so salary/compensation changes stay private)
drop policy if exists audit_admin_read on audit_log;
drop policy if exists audit_super_read on audit_log;
create policy audit_super_read on audit_log
  for select using (auth_role() = 'super_admin');

drop policy if exists login_super_read on login_events;
create policy login_super_read on login_events
  for select using (auth_role() = 'super_admin');
