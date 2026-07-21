-- 0076_job_hunts.sql — a SHARED, collaborative "Job Hunt Board" for BDs. Every BD hunts job posts and
-- logs them here; all BDs see everyone's rows live. Every field is optional (a row may start as just a
-- URL or just a company). No per-owner read scoping — it's deliberately a shared board.
--   feedback  : a SHARED field any BD may edit (e.g. "not valid for this stack"); shown on dismiss.
--   dismissed : soft-hide (struck through), kept for the record with the reason in feedback.
-- Owner-only vs shared write rules are enforced in the API route (a non-owner may only edit feedback +
-- dismiss); RLS stays permissive for CRM users since this is an internal collaborative tool.
create table if not exists job_hunts (
  id            uuid primary key default uuid_generate_v4(),
  owner_bd_id   uuid not null references profiles(id) on delete cascade,
  company       text,
  position      text,
  job_post_url  text,
  stack_id      uuid references dev_stacks(id) on delete set null,
  feedback      text,
  dismissed     boolean not null default false,
  dismissed_by  uuid references profiles(id) on delete set null,
  dismissed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_job_hunts_owner on job_hunts(owner_bd_id);
create index if not exists idx_job_hunts_url on job_hunts(lower(job_post_url));
create index if not exists idx_job_hunts_company on job_hunts(lower(company));

drop trigger if exists trg_job_hunts_updated on job_hunts;
create trigger trg_job_hunts_updated before update on job_hunts for each row execute function set_updated_at();

alter table job_hunts enable row level security;
-- read: any CRM user sees the whole board.
drop policy if exists job_hunts_read on job_hunts;
create policy job_hunts_read on job_hunts for select using (auth_has_perm('crm.access'));
-- insert: a CRM user adds their OWN rows.
drop policy if exists job_hunts_insert on job_hunts;
create policy job_hunts_insert on job_hunts for insert with check (auth_has_perm('crm.access') and owner_bd_id = auth.uid());
-- update: any CRM user (column-level rules — owner vs feedback/dismiss-only — enforced in the API route).
drop policy if exists job_hunts_update on job_hunts;
create policy job_hunts_update on job_hunts for update using (auth_has_perm('crm.access')) with check (auth_has_perm('crm.access'));
-- delete: the owner or a super admin.
drop policy if exists job_hunts_delete on job_hunts;
create policy job_hunts_delete on job_hunts for delete using (owner_bd_id = auth.uid() or auth_role() = 'super_admin');

-- live updates: add to the realtime publication (guarded — Supabase projects have it by default).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table job_hunts;
  end if;
exception when duplicate_object then null;
end $$;
