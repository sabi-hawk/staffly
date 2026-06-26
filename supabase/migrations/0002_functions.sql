-- 0002_functions.sql — Functions & triggers (PRD §6)

-- 6.1 updated_at maintenance
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated  before update on profiles
  for each row execute function set_updated_at();
drop trigger if exists trg_attendance_updated on attendance;
create trigger trg_attendance_updated before update on attendance
  for each row execute function set_updated_at();
drop trigger if exists trg_shifts_updated on shifts;
create trigger trg_shifts_updated before update on shifts
  for each row execute function set_updated_at();
drop trigger if exists trg_leave_requests_updated on leave_requests;
create trigger trg_leave_requests_updated before update on leave_requests
  for each row execute function set_updated_at();
drop trigger if exists trg_leave_balances_updated on leave_balances;
create trigger trg_leave_balances_updated before update on leave_balances
  for each row execute function set_updated_at();
drop trigger if exists trg_salary_structures_updated on salary_structures;
create trigger trg_salary_structures_updated before update on salary_structures
  for each row execute function set_updated_at();
drop trigger if exists trg_payroll_runs_updated on payroll_runs;
create trigger trg_payroll_runs_updated before update on payroll_runs
  for each row execute function set_updated_at();

-- 6.2 auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name','New Employee'),
          new.email,
          coalesce((new.raw_user_meta_data->>'role')::user_role,'employee'))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 6.3 compute hours on checkout (non-netting: deficit & extra independent)
create or replace function compute_attendance_hours()
returns trigger language plpgsql as $$
declare
  exp numeric(5,2);
begin
  if new.check_in_time is not null and new.check_out_time is not null then
    new.total_hours := round(
      extract(epoch from (new.check_out_time - new.check_in_time))/3600.0, 2);

    exp := new.expected_hours;
    if exp is null then
      select round(extract(epoch from (s.end_time - s.start_time))/3600.0,2)
        into exp
      from shifts s
      where s.employee_id = new.employee_id and s.is_active
      order by s.effective_from desc limit 1;
      new.expected_hours := exp;
    end if;

    if exp is not null then
      new.deficit_hours := greatest(exp - new.total_hours, 0);
      new.extra_hours   := greatest(new.total_hours - exp, 0);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_attendance_hours on attendance;
create trigger trg_attendance_hours
  before insert or update on attendance
  for each row execute function compute_attendance_hours();

-- 6.4 helper: working days in a range (excludes holidays, respects shift days)
create or replace function working_days(p_employee uuid, p_start date, p_end date)
returns int language sql stable as $$
  with d as (select generate_series(p_start, p_end, interval '1 day')::date dt)
  select count(*)::int
  from d
  join shifts s on s.employee_id = p_employee and s.is_active
  where extract(dow from d.dt)::int = any(s.days_of_week)
    and not exists (select 1 from holidays h where h.holiday_date = d.dt);
$$;
