-- 0012_crm_fixes.sql — review fixes for the CRM foundation (0010/0011).

-- (1) BLOCKER: also guard the legacy TEXT `department` column. The CRM access layers (middleware,
-- nav, auth_is_bd()) key on this text field, so a non-admin self-setting it = 'Business Development'
-- would slip past the gate. The guard trigger previously only checked department_id.
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(auth_role(), 'employee') not in ('admin','super_admin') then
    if NEW.role          is distinct from OLD.role
    or NEW.status        is distinct from OLD.status
    or NEW.department     is distinct from OLD.department
    or NEW.department_id  is distinct from OLD.department_id
    or NEW.is_bd_lead    is distinct from OLD.is_bd_lead
    or NEW.is_developer  is distinct from OLD.is_developer then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;
  return NEW;
end $$;

-- (2) dev_profile_documents.updated_at + trigger (every table has a maintained updated_at).
alter table dev_profile_documents add column if not exists updated_at timestamptz not null default now();
drop trigger if exists trg_dev_profile_documents_updated on dev_profile_documents;
create trigger trg_dev_profile_documents_updated before update on dev_profile_documents
  for each row execute function set_updated_at();

-- (3) Atomic "make this resume primary" (admin/super only). Avoids the unset-then-set interleave
-- that could momentarily leave zero primaries under concurrent edits.
create or replace function crm_set_primary_document(p_doc_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_profile uuid; v_type text;
begin
  if auth_role() not in ('admin','super_admin') then
    raise exception 'Forbidden';
  end if;
  select dev_profile_id, doc_type into v_profile, v_type from dev_profile_documents where id = p_doc_id;
  if v_profile is null then raise exception 'Not found'; end if;
  if v_type <> 'resume' then raise exception 'Only resumes can be primary'; end if;
  update dev_profile_documents set is_primary = false
    where dev_profile_id = v_profile and doc_type = 'resume' and id <> p_doc_id and is_primary;
  update dev_profile_documents set is_primary = true where id = p_doc_id and not is_primary;
end $$;
