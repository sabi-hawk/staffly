-- 0043: memorable dev-profile numbers (owner, 2026-07-07).
-- Two profiles can share a name (and even a stack), so each profile gets a short number
-- BDs can remember and say out loud ("Ali #16"). Starts at 11 (single digits read like
-- ranks, not IDs). Auto-assigned on insert; unique so an admin can hand-edit if ever needed.

create sequence if not exists dev_profile_no_seq start 11;

alter table dev_profiles add column if not exists profile_no int;

-- backfill existing profiles in creation order
with numbered as (
  select id, 10 + row_number() over (order by created_at, id) as rn
  from dev_profiles
  where profile_no is null
)
update dev_profiles p set profile_no = n.rn from numbered n where p.id = n.id;

select setval('dev_profile_no_seq', coalesce((select max(profile_no) from dev_profiles), 10) + 1, false);

alter table dev_profiles alter column profile_no set default nextval('dev_profile_no_seq');
alter table dev_profiles alter column profile_no set not null;
create unique index if not exists dev_profiles_profile_no_uniq on dev_profiles (profile_no);
