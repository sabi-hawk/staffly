-- 0039_employee_notifications.sql — employee-facing notifications (review backlog, owner-approved).
-- An in-app feed per employee (topbar bell). Rows are created by SECURITY-DEFINER triggers — no client
-- insert path: (a) a leave decision (pending → approved/rejected) notifies the requester, with the
-- decision note; (b) a new announcement notifies every active employee. Employees read + mark-read
-- their own rows only.

create table if not exists employee_notifications (
  id          uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  type        text not null,            -- leave_decision | announcement | …
  message     text not null,
  link        text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists idx_emp_notif on employee_notifications(employee_id, read_at);

alter table employee_notifications enable row level security;
drop policy if exists emp_notif_self_read on employee_notifications;
create policy emp_notif_self_read on employee_notifications for select using (employee_id = auth.uid());
drop policy if exists emp_notif_self_mark on employee_notifications;
create policy emp_notif_self_mark on employee_notifications for update
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());
-- no INSERT/DELETE policies: rows come from the definer triggers below (or service role)

-- (a) leave decision → notify the requester
create or replace function notify_leave_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if OLD.status = 'pending' and NEW.status in ('approved','rejected') then
    insert into employee_notifications (employee_id, type, message, link)
    values (
      NEW.employee_id,
      'leave_decision',
      initcap(NEW.type::text) || ' leave ' || to_char(NEW.start_date,'DD Mon') ||
        case when NEW.end_date <> NEW.start_date then '–' || to_char(NEW.end_date,'DD Mon') else '' end ||
        ' was ' || NEW.status ||
        case when NEW.status = 'rejected' and coalesce(NEW.decision_note,'') <> '' then ': ' || NEW.decision_note else '' end,
      '/leaves'
    );
  end if;
  return NEW;
end $$;
drop trigger if exists trg_notify_leave_decision on leave_requests;
create trigger trg_notify_leave_decision after update on leave_requests
  for each row execute function notify_leave_decision();

-- (b) new announcement → notify all active employees (small company; a simple fan-out)
create or replace function notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into employee_notifications (employee_id, type, message, link)
  select p.id, 'announcement', 'New announcement: ' || coalesce(NEW.title,'(untitled)'), '/announcements'
  from profiles p where p.status = 'active' and p.id <> coalesce(NEW.author_id, '00000000-0000-0000-0000-000000000000'::uuid);
  return NEW;
end $$;
drop trigger if exists trg_notify_announcement on announcements;
create trigger trg_notify_announcement after insert on announcements
  for each row execute function notify_announcement();
