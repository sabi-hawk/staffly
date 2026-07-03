-- 0019_security_hardening.sql — audit fixes (Group 1 blocker/high + Group 2 signup-role).

-- ── (1) BLOCKER: stop role self-escalation. Only super_admin may change `role`; nobody escalates
-- to super_admin except a super_admin. Non-admins still can't change any privileged column.
-- (Admins legitimately change status/department on employees — those stay allowed for admins;
-- only `role` changes are locked to super_admin, and the app never exposes a role editor to admins.)
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(auth_role(), 'employee');
begin
  if auth.uid() is null then
    return NEW; -- service-role (seed / admin API / cron) — trusted
  end if;

  -- non-admins: cannot change any privileged column on their own row
  if v_role not in ('admin','super_admin') then
    if NEW.role         is distinct from OLD.role
    or NEW.status       is distinct from OLD.status
    or NEW.department     is distinct from OLD.department
    or NEW.department_id  is distinct from OLD.department_id
    or NEW.is_bd_lead   is distinct from OLD.is_bd_lead
    or NEW.is_developer is distinct from OLD.is_developer then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;

  -- ANYONE below super_admin (incl. admin) cannot change `role`; role management is super_admin-only.
  if v_role <> 'super_admin' and NEW.role is distinct from OLD.role then
    raise exception 'Only a super-admin can change a role';
  end if;

  return NEW;
end $$;

-- ── (2) signup role trust: handle_new_user must never honour a client-supplied role.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name','New Employee'),
          new.email,
          'employee')   -- always 'employee'; elevation is a deliberate admin action, never self-service
  on conflict (id) do nothing;
  return new;
end; $$;

-- ── (3) Attendance integrity: constraints + current-company-day write scoping.
-- Company day (Asia/Karachi) helper, immutable-ish for use in CHECK/policies.
create or replace function company_today()
returns date language sql stable as $$ select (now() at time zone 'Asia/Karachi')::date; $$;

-- sanity constraints (a session can't end before it starts; work_date within a sane window)
alter table attendance_sessions drop constraint if exists att_sessions_time_order;
alter table attendance_sessions add constraint att_sessions_time_order
  check (ended_at is null or started_at is null or ended_at >= started_at);

-- employees may only write their OWN attendance for the CURRENT company day (no backdating/forging);
-- admins/super-admins retain full write for corrections.
drop policy if exists att_self_insert on attendance;
create policy att_self_insert on attendance
  for insert with check (
    auth_role() in ('admin','super_admin')
    or (employee_id = auth.uid() and work_date = company_today())
  );
drop policy if exists att_update on attendance;
create policy att_update on attendance
  for update using (
    auth_role() in ('admin','super_admin')
    or (employee_id = auth.uid() and work_date = company_today())
  );

drop policy if exists sessions_self_write on attendance_sessions;
create policy sessions_self_write on attendance_sessions
  for all using (
    auth_role() in ('admin','super_admin')
    or (employee_id = auth.uid() and work_date = company_today())
  )
  with check (
    auth_role() in ('admin','super_admin')
    or (employee_id = auth.uid() and work_date = company_today())
  );
