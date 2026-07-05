-- 0028_daily_summary_fn.sql — save a daily task summary via a security-definer function.
-- Why: the att_update RLS policy (0019) only lets an employee update TODAY's attendance row, so a
-- late add on a PAST row would silently no-op. This function updates ONLY the three summary columns
-- (never times/hours), so it safely bypasses that restriction for late adds while keeping employees
-- unable to edit past times. It also enforces the rules authoritatively (same-day edit / past-locked /
-- past-late / no-future / must-have-attendance). Called with the caller's own session (auth.uid()).

create or replace function save_daily_summary(p_work_date date, p_html text)
returns boolean  -- returns whether this was a LATE add
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_today    date := company_today();
  v_existing text;
  v_late     boolean;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  -- reject empty content (defense in depth — the service also strips + checks before calling)
  if btrim(regexp_replace(regexp_replace(coalesce(p_html, ''), '<[^>]*>', '', 'g'), '&nbsp;', ' ', 'gi')) = '' then
    raise exception 'Please write a short summary before saving.';
  end if;
  if p_work_date > v_today then raise exception 'You can''t add a summary for a future day.'; end if;

  select daily_summary into v_existing
  from attendance where employee_id = v_uid and work_date = p_work_date;
  if not found then raise exception 'No attendance for that day — check in first.'; end if;

  -- a past day whose summary is already written is locked
  if p_work_date < v_today and btrim(regexp_replace(coalesce(v_existing, ''), '<[^>]*>', '', 'g')) <> '' then
    raise exception 'This day has passed — its summary is locked and can''t be edited.';
  end if;

  v_late := p_work_date < v_today;
  update attendance
    set daily_summary = p_html, summary_at = now(), summary_late = v_late
  where employee_id = v_uid and work_date = p_work_date;
  return v_late;
end $$;

revoke all on function save_daily_summary(date, text) from public;
grant execute on function save_daily_summary(date, text) to authenticated;
