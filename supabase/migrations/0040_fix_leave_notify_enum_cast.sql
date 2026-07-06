-- 0040: fix notify_leave_decision — initcap() needs text, NEW.type is the leave_type enum.
-- Without the cast every leave approve/reject failed with "function initcap(leave_type) does not exist".

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
