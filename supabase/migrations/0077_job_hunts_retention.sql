-- 0077_job_hunts_retention.sql — auto-cleanup for the shared Job Hunt Board (0076).
-- The board is a working surface: BDs paste dozens of job-post links a day, and old links go stale.
-- We keep the board lean by DELETING rows older than a retention window (default 10 days) — but the
-- per-BD "jobs hunted" daily counts must survive forever (they feed the daily summary + admin reports).
-- So before any delete we SNAPSHOT each BD's per-day count into job_hunt_daily_counts, then purge.
--
-- The snapshot uses GREATEST on conflict so a day's stored count only ever reflects its PEAK — once a
-- day's live rows are purged its live count drops to 0, but the snapshot keeps the real total. The
-- whole thing (snapshot → purge) is one idempotent RPC (purge_job_hunts) called by the daily cron.

create table if not exists job_hunt_daily_counts (
  owner_bd_id  uuid not null references profiles(id) on delete cascade,
  day          date not null,                 -- Asia/Karachi calendar day
  count        integer not null default 0,    -- jobs that BD hunted (added to the board) that day
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (owner_bd_id, day)
);
create index if not exists idx_job_hunt_counts_day on job_hunt_daily_counts(day);

drop trigger if exists trg_job_hunt_counts_updated on job_hunt_daily_counts;
create trigger trg_job_hunt_counts_updated before update on job_hunt_daily_counts
  for each row execute function set_updated_at();

alter table job_hunt_daily_counts enable row level security;
-- read: same audience as the board itself (any CRM user); the counts are non-sensitive.
drop policy if exists job_hunt_counts_read on job_hunt_daily_counts;
create policy job_hunt_counts_read on job_hunt_daily_counts for select using (auth_has_perm('crm.access'));
-- No client insert/update/delete policies: rows are written ONLY by the definer functions below
-- (invoked by the service-role cron). This keeps historical counts tamper-proof from the UI.

-- Snapshot every BD's per-Karachi-day count from the LIVE board into the counts table. GREATEST keeps
-- the peak so re-running (or running after a partial purge) never lowers a stored total.
create or replace function snapshot_job_hunt_counts() returns void
language sql security definer set search_path = public as $$
  insert into job_hunt_daily_counts (owner_bd_id, day, count)
  select owner_bd_id, (created_at at time zone 'Asia/Karachi')::date as day, count(*)::int
  from job_hunts
  group by owner_bd_id, (created_at at time zone 'Asia/Karachi')::date
  on conflict (owner_bd_id, day)
  do update set count = greatest(job_hunt_daily_counts.count, excluded.count), updated_at = now();
$$;

-- Snapshot, then delete board rows whose Karachi day is older than retention_days. Returns the number
-- of rows purged. Idempotent: the snapshot preserves counts, so purged days keep their totals.
create or replace function purge_job_hunts(retention_days int default 10) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform snapshot_job_hunt_counts();
  with del as (
    delete from job_hunts
    where (created_at at time zone 'Asia/Karachi')::date
          < ((now() at time zone 'Asia/Karachi')::date - retention_days)
    returning 1
  )
  select count(*) into n from del;
  return n;
end $$;

-- Lock the functions down: only the service-role cron may run them (never an authenticated client).
revoke all on function snapshot_job_hunt_counts() from public, anon, authenticated;
revoke all on function purge_job_hunts(int) from public, anon, authenticated;
grant execute on function snapshot_job_hunt_counts() to service_role;
grant execute on function purge_job_hunts(int) to service_role;
