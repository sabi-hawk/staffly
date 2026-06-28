-- 0009 — multi-session attendance, probation/contract flag, admin notifications,
-- calendar/holiday types, announcements text body.

-- ---------- contract type ----------
alter table profiles add column if not exists contract_type text not null default 'permanent'; -- permanent | probation

-- ---------- attendance sessions (multiple check-in/out per day; breaks excluded) ----------
create table if not exists attendance_sessions (
  id          uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  work_date   date not null,
  started_at  timestamptz not null,
  ended_at    timestamptz,                -- null = currently checked in (open session)
  source      text default 'portal',
  created_at  timestamptz not null default now()
);
create index if not exists idx_sessions_emp_date on attendance_sessions(employee_id, work_date);
create index if not exists idx_sessions_open on attendance_sessions(employee_id) where ended_at is null;

-- day total = sum of completed sessions when sessions exist, else legacy check_in/out diff.
create or replace function compute_attendance_hours()
returns trigger language plpgsql as $$
declare
  exp numeric(5,2);
  sess numeric;
  has_sessions boolean;
begin
  exp := new.expected_hours;
  if exp is null then
    select round(extract(epoch from (s.end_time - s.start_time))/3600.0,2) into exp
    from shifts s where s.employee_id = new.employee_id and s.is_active
    order by s.effective_from desc limit 1;
    new.expected_hours := exp;
  end if;

  select exists(select 1 from attendance_sessions a where a.employee_id=new.employee_id and a.work_date=new.work_date)
    into has_sessions;

  if has_sessions then
    select coalesce(sum(extract(epoch from (ended_at - started_at))/3600.0),0) into sess
    from attendance_sessions a where a.employee_id=new.employee_id and a.work_date=new.work_date and ended_at is not null;
    new.total_hours := round(sess,2);
  elsif new.check_in_time is not null and new.check_out_time is not null then
    new.total_hours := round(extract(epoch from (new.check_out_time - new.check_in_time))/3600.0, 2);
  end if;

  if exp is not null and new.total_hours is not null then
    new.deficit_hours := greatest(exp - new.total_hours, 0);
    new.extra_hours   := greatest(new.total_hours - exp, 0);
  end if;
  return new;
end; $$;

-- when sessions change, refresh the parent attendance row (which recomputes totals above)
create or replace function recompute_attendance_day()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  eid uuid; wd date; first_in timestamptz; last_out timestamptz; open_count int;
begin
  eid := coalesce(NEW.employee_id, OLD.employee_id);
  wd  := coalesce(NEW.work_date, OLD.work_date);
  select min(started_at), max(ended_at), count(*) filter (where ended_at is null)
    into first_in, last_out, open_count
  from attendance_sessions where employee_id=eid and work_date=wd;

  insert into attendance (employee_id, work_date, check_in_time, status)
    values (eid, wd, first_in, 'present')
    on conflict (employee_id, work_date) do nothing;
  update attendance
    set check_in_time = first_in,
        check_out_time = case when open_count > 0 then null else last_out end
    where employee_id=eid and work_date=wd;
  return coalesce(NEW, OLD);
end; $$;

drop trigger if exists trg_sessions_recompute on attendance_sessions;
create trigger trg_sessions_recompute after insert or update or delete on attendance_sessions
  for each row execute function recompute_attendance_day();

drop trigger if exists trg_audit_attendance_sessions on attendance_sessions;
create trigger trg_audit_attendance_sessions after insert or update or delete on attendance_sessions
  for each row execute function record_audit();

alter table attendance_sessions enable row level security;
drop policy if exists sessions_self_read on attendance_sessions;
create policy sessions_self_read on attendance_sessions
  for select using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));
drop policy if exists sessions_self_write on attendance_sessions;
create policy sessions_self_write on attendance_sessions
  for all using (employee_id = auth.uid() or auth_role() in ('admin','super_admin'))
  with check (employee_id = auth.uid() or auth_role() in ('admin','super_admin'));

-- ---------- admin notifications (probation ended, payslip reminder, birthdays) ----------
create table if not exists admin_notifications (
  id         uuid primary key default uuid_generate_v4(),
  type       text not null,                 -- probation_ended | payslip_reminder | birthday
  message    text not null,
  severity   text not null default 'info',  -- info | warning
  link       text,
  dedup_key  text unique,                   -- prevents duplicates per period/subject
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_notif_created on admin_notifications(created_at desc);
alter table admin_notifications enable row level security;
drop policy if exists admin_notif_read on admin_notifications;
create policy admin_notif_read on admin_notifications
  for select using (auth_role() in ('admin','super_admin'));
drop policy if exists admin_notif_write on admin_notifications;
create policy admin_notif_write on admin_notifications
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- ---------- calendar / holidays type + announcements text body ----------
alter table holidays add column if not exists type text not null default 'public'; -- public | national | company
alter table announcements add column if not exists body_text text;
alter table announcements alter column body drop not null;
