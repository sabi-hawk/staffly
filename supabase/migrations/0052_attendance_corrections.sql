-- 0052: timesheet correction requests (owner, 2026-07-08). An employee whose attendance for a past day
-- is MISSING or WRONG (forgot to check in/out) submits a correction request with the intended times +
-- reason. It stays PENDING and visible to them; an admin (attendance.edit_all) approves — which APPLIES
-- the times to attendance — or rejects with a note. Employees can never self-approve.
create table if not exists attendance_correction_requests (
  id                   uuid primary key default uuid_generate_v4(),
  employee_id          uuid not null references profiles(id) on delete cascade,
  attendance_id        uuid references attendance(id) on delete set null, -- null when the day has no row yet
  work_date            date not null,
  requested_check_in   timestamptz,
  requested_check_out  timestamptz,
  kind                 text not null check (kind in ('missing', 'wrong_time', 'forgot_checkout')),
  reason               text,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by          uuid references profiles(id),
  reviewed_at          timestamptz,
  decision_note        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_acr_employee on attendance_correction_requests(employee_id, work_date);
create index if not exists idx_acr_status on attendance_correction_requests(status);

drop trigger if exists trg_acr_updated on attendance_correction_requests;
create trigger trg_acr_updated before update on attendance_correction_requests
  for each row execute function set_updated_at();
drop trigger if exists trg_audit_acr on attendance_correction_requests;
create trigger trg_audit_acr after insert or update or delete on attendance_correction_requests
  for each row execute function record_audit();

alter table attendance_correction_requests enable row level security;
-- Employee reads OWN; admin/HR (attendance.edit_all) read all.
drop policy if exists acr_read on attendance_correction_requests;
create policy acr_read on attendance_correction_requests for select
  using (employee_id = auth.uid() or auth_has_perm('attendance.edit_all'));
-- Employee inserts OWN, always pending (can't self-approve by seeding status).
drop policy if exists acr_self_insert on attendance_correction_requests;
create policy acr_self_insert on attendance_correction_requests for insert
  with check (employee_id = auth.uid() and status = 'pending');
-- Only admin/HR may update (decide). Employees cannot approve/edit a submitted request.
drop policy if exists acr_admin_update on attendance_correction_requests;
create policy acr_admin_update on attendance_correction_requests for update
  using (auth_has_perm('attendance.edit_all')) with check (auth_has_perm('attendance.edit_all'));
-- Employee may withdraw (delete) their OWN still-pending request; admin may delete any.
drop policy if exists acr_delete on attendance_correction_requests;
create policy acr_delete on attendance_correction_requests for delete
  using (auth_has_perm('attendance.edit_all') or (employee_id = auth.uid() and status = 'pending'));

-- Decision notification (mirror notify_leave_decision, 0039): bell the employee on approve/reject.
create or replace function notify_correction_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if OLD.status = 'pending' and NEW.status in ('approved', 'rejected') then
    insert into employee_notifications (employee_id, type, message, link)
    values (
      NEW.employee_id,
      'timesheet_correction',
      'Timesheet correction for ' || to_char(NEW.work_date, 'DD Mon') || ' was ' || NEW.status ||
        case when NEW.status = 'rejected' and coalesce(NEW.decision_note, '') <> '' then ': ' || NEW.decision_note else '' end,
      '/attendance'
    );
  end if;
  return NEW;
end $$;
drop trigger if exists trg_acr_notify on attendance_correction_requests;
create trigger trg_acr_notify after update on attendance_correction_requests
  for each row execute function notify_correction_decision();
