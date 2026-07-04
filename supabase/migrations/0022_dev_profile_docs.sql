-- 0022_dev_profile_docs.sql — dev-profile documents: per-doc note, soft-delete, and owner (BD) write.
-- BD owners can add/mark-primary/note/soft-delete their own profile's resumes & cover letters; only
-- admin/super may HARD-delete (from the history). Soft-deleted rows are retained + shown to admins.

alter table dev_profile_documents add column if not exists note text;
alter table dev_profile_documents add column if not exists deleted_at timestamptz;
alter table dev_profile_documents add column if not exists deleted_by uuid references profiles(id) on delete set null;

-- The unique "one primary resume per profile" index should ignore soft-deleted rows.
drop index if exists uniq_primary_resume;
create unique index if not exists uniq_primary_resume
  on dev_profile_documents(dev_profile_id) where doc_type = 'resume' and is_primary and deleted_at is null;

-- Replace the admin-only ALL policy with owner-scoped insert/update + admin-only hard-delete.
drop policy if exists dev_docs_admin_write on dev_profile_documents;

-- may this caller manage docs on this profile? (owning BD, BD-Lead, or admin/super via auth_is_bd_lead)
create or replace function can_manage_dev_docs(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dev_profiles dp
    where dp.id = p_profile and (auth_is_bd_lead() or dp.owner_bd_id = auth.uid())
  );
$$;

drop policy if exists dev_docs_owner_insert on dev_profile_documents;
create policy dev_docs_owner_insert on dev_profile_documents for insert
  with check (can_manage_dev_docs(dev_profile_id));

drop policy if exists dev_docs_owner_update on dev_profile_documents;
create policy dev_docs_owner_update on dev_profile_documents for update
  using (can_manage_dev_docs(dev_profile_id))
  with check (can_manage_dev_docs(dev_profile_id));

-- hard delete: admin/super only (BD deletes are soft — an UPDATE that sets deleted_at).
drop policy if exists dev_docs_admin_delete on dev_profile_documents;
create policy dev_docs_admin_delete on dev_profile_documents for delete
  using (auth_role() in ('admin','super_admin'));
