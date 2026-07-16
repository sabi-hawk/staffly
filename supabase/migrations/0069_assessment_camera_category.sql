-- 0069_assessment_camera_category.sql — richer assessment metadata (all OPTIONAL, default unset):
--   * camera         — whether the assessment is taken with a camera on. null = not determined (default),
--                      'with' = with camera, 'without' = without camera.
--   * category_id    — the kind of assessment (Coding, MCQs, Coding + MCQs, Video introduction, …),
--                      drawn from a CONFIGURABLE list (assessment_categories) — same dynamic-add pattern
--                      as dev_stacks, so new kinds can be added without a migration.

-- ── assessment_categories (configurable taxonomy, mirrors dev_stacks) ──────────
create table if not exists assessment_categories (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into assessment_categories (name, sort_order) values
  ('Coding',1),('MCQs',2),('Coding + MCQs',3),('Video introduction',4),
  ('Video recording',5),('Take-home project',6)
on conflict (name) do nothing;

drop trigger if exists trg_assessment_categories_updated on assessment_categories;
create trigger trg_assessment_categories_updated before update on assessment_categories
  for each row execute function set_updated_at();

alter table assessment_categories enable row level security;
-- read: any authenticated user (feeds the category dropdown). write: CRM managers + admins/super.
drop policy if exists assessment_categories_read on assessment_categories;
create policy assessment_categories_read on assessment_categories
  for select using (auth.uid() is not null);
drop policy if exists assessment_categories_manage on assessment_categories;
create policy assessment_categories_manage on assessment_categories
  for all using (auth_role() in ('admin','super_admin') or auth_has_perm('crm.profiles.manage'))
  with check (auth_role() in ('admin','super_admin') or auth_has_perm('crm.profiles.manage'));

-- ── assessments: camera + category (both optional) ────────────────────────────
alter table assessments
  add column if not exists camera text check (camera is null or camera in ('with','without')),
  add column if not exists category_id uuid references assessment_categories(id) on delete set null;
create index if not exists idx_assessments_category on assessments(category_id);
