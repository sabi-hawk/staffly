-- 0011_crm_profiles.sql — CRM Profiles & Resumes (FRD-01).
-- Marketing developer profiles (dev_profiles), their stacks, the account password (separate,
-- admin-only), and their resume/cover-letter documents (private storage).

-- ── Stacks lookup (extendable) ────────────────────────────────────────────────
create table if not exists dev_stacks (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into dev_stacks (name, sort_order) values
  ('Full Stack',1),('Backend',2),('Frontend',3),('SEO',4),('WordPress',5),
  ('Data Engineer',6),('AI/ML',7),('MERN',8),('Mobile',9)
on conflict (name) do nothing;

-- ── dev_profiles (a standalone marketing identity; owner = a BD) ───────────────
create table if not exists dev_profiles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  stack_id    uuid references dev_stacks(id),
  owner_bd_id uuid references profiles(id),          -- a BD; null = Unassigned
  email       text,
  mobile      text,
  dob         date,
  status      employee_status not null default 'active',  -- active | inactive
  notes       text,                                   -- e.g. "LinkedIn banned"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_dev_profiles_owner on dev_profiles(owner_bd_id);
create index if not exists idx_dev_profiles_stack on dev_profiles(stack_id);

-- ── dev_profile_secrets (account password) — admin/super-admin only ───────────
-- NOT audited: record_audit() would copy the password into audit_log. Kept out on purpose.
create table if not exists dev_profile_secrets (
  dev_profile_id   uuid primary key references dev_profiles(id) on delete cascade,
  account_password text,
  updated_by       uuid references profiles(id),
  updated_at       timestamptz not null default now()
);

-- ── dev_profile_documents (resume | cover_letter) — private bucket paths ───────
create table if not exists dev_profile_documents (
  id             uuid primary key default uuid_generate_v4(),
  dev_profile_id uuid not null references dev_profiles(id) on delete cascade,
  doc_type       text not null check (doc_type in ('resume','cover_letter')),
  label          text,
  is_primary     boolean not null default false,
  file_path      text not null,
  file_name      text,
  uploaded_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_dev_docs_profile on dev_profile_documents(dev_profile_id);
-- exactly one primary resume per profile
create unique index if not exists uniq_primary_resume
  on dev_profile_documents(dev_profile_id) where doc_type = 'resume' and is_primary;

-- ── updated_at triggers ───────────────────────────────────────────────────────
drop trigger if exists trg_dev_stacks_updated on dev_stacks;
create trigger trg_dev_stacks_updated before update on dev_stacks
  for each row execute function set_updated_at();
drop trigger if exists trg_dev_profiles_updated on dev_profiles;
create trigger trg_dev_profiles_updated before update on dev_profiles
  for each row execute function set_updated_at();
drop trigger if exists trg_dev_profile_secrets_updated on dev_profile_secrets;
create trigger trg_dev_profile_secrets_updated before update on dev_profile_secrets
  for each row execute function set_updated_at();

-- ── audit triggers (data tables only; NOT secrets) ────────────────────────────
drop trigger if exists trg_audit_dev_profiles on dev_profiles;
create trigger trg_audit_dev_profiles after insert or update or delete on dev_profiles
  for each row execute function record_audit();
drop trigger if exists trg_audit_dev_profile_documents on dev_profile_documents;
create trigger trg_audit_dev_profile_documents after insert or update or delete on dev_profile_documents
  for each row execute function record_audit();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table dev_stacks           enable row level security;
alter table dev_profiles         enable row level security;
alter table dev_profile_secrets  enable row level security;
alter table dev_profile_documents enable row level security;

-- stacks: any authenticated read; admin/super write
drop policy if exists dev_stacks_read on dev_stacks;
create policy dev_stacks_read on dev_stacks for select using (auth.uid() is not null);
drop policy if exists dev_stacks_admin_write on dev_stacks;
create policy dev_stacks_admin_write on dev_stacks
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- dev_profiles: BD sees OWN (owner_bd_id = self); BD-Lead + admin/super see ALL.
-- Create/edit/assign = admin/super only (BDs are read-only per FRD-01).
drop policy if exists dev_profiles_select on dev_profiles;
create policy dev_profiles_select on dev_profiles
  for select using (auth_is_bd_lead() or owner_bd_id = auth.uid());
drop policy if exists dev_profiles_admin_write on dev_profiles;
create policy dev_profiles_admin_write on dev_profiles
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- secrets: admin/super only (never BD / BD-Lead)
drop policy if exists dev_secrets_admin on dev_profile_secrets;
create policy dev_secrets_admin on dev_profile_secrets
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- documents: same visibility as the parent profile; write = admin/super only
drop policy if exists dev_docs_select on dev_profile_documents;
create policy dev_docs_select on dev_profile_documents
  for select using (
    auth_is_bd_lead()
    or exists (select 1 from dev_profiles p
               where p.id = dev_profile_id and p.owner_bd_id = auth.uid())
  );
drop policy if exists dev_docs_admin_write on dev_profile_documents;
create policy dev_docs_admin_write on dev_profile_documents
  for all using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));
