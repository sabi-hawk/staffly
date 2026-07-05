-- 0034_crm_calendar.sql — a shared interview calendar for BDs + admin, with cross-BD privacy.
-- Interviews are owner-scoped by RLS (a BD can't read another BD's rows), but the calendar needs every
-- booking's time + stack + owner (for colour) so BDs don't double-book a developer. This definer fn
-- returns scheduled interviews in a range; company / job_title / developer are revealed ONLY for the
-- caller's OWN interviews (or to admin/super) — other BDs see just time + stack + whose it is.
-- Non-BD, non-admin callers get zero rows.

create or replace function crm_calendar(p_from timestamptz, p_to timestamptz)
returns table(
  id uuid, interview_at timestamptz, round text, status text, outcome text,
  owner_bd_id uuid, owner_name text, stack text,
  company text, job_title text, developer text, can_expand boolean, is_mine boolean
)
language sql stable security definer set search_path = public as $$
  select
    i.id, i.interview_at, i.round, i.status, i.outcome,
    i.owner_bd_id, ownp.full_name as owner_name, ds.name as stack,
    case when (i.owner_bd_id = auth.uid() or auth_role() in ('admin','super_admin')) then i.company end as company,
    case when (i.owner_bd_id = auth.uid() or auth_role() in ('admin','super_admin')) then i.job_title end as job_title,
    case when (i.owner_bd_id = auth.uid() or auth_role() in ('admin','super_admin')) then coalesce(devp.full_name, gbp.full_name) end as developer,
    (i.owner_bd_id = auth.uid() or auth_role() in ('admin','super_admin')) as can_expand,
    (i.owner_bd_id = auth.uid()) as is_mine
  from interviews i
  left join profiles ownp on ownp.id = i.owner_bd_id
  left join dev_profiles dp on dp.id = i.dev_profile_id
  left join dev_stacks ds on ds.id = dp.stack_id
  left join profiles devp on devp.id = i.whom_should_give
  left join profiles gbp on gbp.id = i.given_by
  where i.interview_at is not null
    and i.interview_at >= p_from and i.interview_at < p_to
    and exists (select 1 from profiles me where me.id = auth.uid()
                and (me.department = 'Business Development' or me.role in ('admin','super_admin')))
  order by i.interview_at;
$$;
revoke all on function crm_calendar(timestamptz, timestamptz) from public;
grant execute on function crm_calendar(timestamptz, timestamptz) to authenticated;
