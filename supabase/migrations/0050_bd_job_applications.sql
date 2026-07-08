-- 0050: BD daily job-application counts (owner, 2026-07-08). A BD applies for jobs each day against the
-- dev profiles assigned to them; they log a per-profile count for the day. Feeds BD performance.
-- One row per (dev_profile_id, work_date). Writes go ONLY through the security-definer save_job_counts
-- RPC (validates profile ownership via auth.uid), so there is no direct insert/update policy — reads
-- are owner-scoped (a BD sees own; BD-Lead/admin/super see all, like leads).

create table if not exists bd_job_applications (
  id            uuid primary key default uuid_generate_v4(),
  owner_bd_id   uuid not null references profiles(id),
  dev_profile_id uuid not null references dev_profiles(id) on delete cascade,
  work_date     date not null,
  count         int  not null default 0 check (count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (dev_profile_id, work_date)
);
create index if not exists idx_bd_job_apps_owner on bd_job_applications(owner_bd_id, work_date);
create index if not exists idx_bd_job_apps_date  on bd_job_applications(work_date);

drop trigger if exists trg_bd_job_apps_updated on bd_job_applications;
create trigger trg_bd_job_apps_updated before update on bd_job_applications
  for each row execute function set_updated_at();
drop trigger if exists trg_audit_bd_job_apps on bd_job_applications;
create trigger trg_audit_bd_job_apps after insert or update or delete on bd_job_applications
  for each row execute function record_audit();

alter table bd_job_applications enable row level security;
-- Read: the owning BD sees own; BD-Lead + admin/super see all (performance oversight).
drop policy if exists bd_job_apps_select on bd_job_applications;
create policy bd_job_apps_select on bd_job_applications for select
  using (auth_is_bd_lead() or owner_bd_id = auth.uid());
-- No direct write policy: all writes flow through save_job_counts() (definer, ownership-checked).

-- Upsert today's (or a past day's) per-profile counts for the caller. p_counts = jsonb array of
-- { dev_profile_id, count }. Validates each profile is owned by the caller; ignores others. Returns
-- the number of profiles saved.
create or replace function save_job_counts(p_work_date date, p_counts jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := company_today();
  v_item  jsonb;
  v_pid   uuid;
  v_count int;
  v_saved int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not auth_is_bd() then raise exception 'Only a BD can log job applications.'; end if;
  if p_work_date > v_today then raise exception 'You can''t log counts for a future day.'; end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_counts, '[]'::jsonb)) loop
    v_pid   := (v_item->>'dev_profile_id')::uuid;
    v_count := greatest(0, coalesce((v_item->>'count')::int, 0));
    -- only accept a profile the caller OWNS
    if not exists (select 1 from dev_profiles where id = v_pid and owner_bd_id = v_uid) then
      continue;
    end if;
    insert into bd_job_applications (owner_bd_id, dev_profile_id, work_date, count)
      values (v_uid, v_pid, p_work_date, v_count)
    on conflict (dev_profile_id, work_date)
      do update set count = excluded.count, owner_bd_id = excluded.owner_bd_id;
    v_saved := v_saved + 1;
  end loop;
  return v_saved;
end $$;
revoke all on function save_job_counts(date, jsonb) from public;
grant execute on function save_job_counts(date, jsonb) to authenticated;
