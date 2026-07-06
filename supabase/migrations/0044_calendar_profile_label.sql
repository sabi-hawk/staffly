-- 0044: crm_calendar exposes the profile identity "#no Name" (0043 numbers) to viewers who can
-- already expand the event (owner + all-scope). Cross-BD masked view stays time + stack + colour.
drop function if exists crm_calendar(timestamptz, timestamptz);
create or replace function crm_calendar(p_from timestamptz, p_to timestamptz)
returns table(
  id uuid, interview_at timestamptz, round text, status text, outcome text,
  owner_bd_id uuid, owner_name text, stack text, profile_label text,
  company text, job_title text, developer text, can_expand boolean, is_mine boolean
)
language sql stable security definer set search_path = public as $$
  select
    i.id, i.interview_at, i.round, i.status, i.outcome,
    i.owner_bd_id, ownp.full_name as owner_name, ds.name as stack,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all'))
         then '#' || dp.profile_no || ' ' || dp.name end as profile_label,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then i.company end as company,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then i.job_title end as job_title,
    case when (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) then coalesce(devp.full_name, gbp.full_name) end as developer,
    (i.owner_bd_id = auth.uid() or auth_has_perm('crm.leads.all')) as can_expand,
    (i.owner_bd_id = auth.uid()) as is_mine
  from interviews i
  left join profiles ownp on ownp.id = i.owner_bd_id
  left join dev_profiles dp on dp.id = i.dev_profile_id
  left join dev_stacks ds on ds.id = dp.stack_id
  left join profiles devp on devp.id = i.whom_should_give
  left join profiles gbp on gbp.id = i.given_by
  where i.interview_at is not null
    and i.interview_at >= p_from and i.interview_at < p_to
    and auth_has_perm('crm.calendar.view')
  order by i.interview_at;
$$;
revoke all on function crm_calendar(timestamptz, timestamptz) from public;
grant execute on function crm_calendar(timestamptz, timestamptz) to authenticated;
