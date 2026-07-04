-- 0024_dev_docs_soft_delete_fn.sql — soft-delete a profile document via a security-definer function.
-- Why: after 0023 the SELECT policy hides soft-deleted rows from a BD owner. Postgres then rejects the
-- owner's UPDATE that sets deleted_at (the post-update row is no longer selectable by that owner), even
-- though the update WITH CHECK (can_manage_dev_docs) passes. Admins are unaffected (their SELECT branch
-- stays true). Routing the write through a definer function that authorizes via can_manage_dev_docs
-- keeps the "owner may soft-delete, history is admin-only" model without loosening the SELECT policy.

create or replace function crm_soft_delete_document(p_doc_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
begin
  select dev_profile_id into v_profile
  from dev_profile_documents
  where id = p_doc_id and deleted_at is null;
  if v_profile is null then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;
  if not can_manage_dev_docs(v_profile) then
    raise exception 'Forbidden' using errcode = 'insufficient_privilege';
  end if;
  update dev_profile_documents
  set deleted_at = now(), deleted_by = auth.uid(), is_primary = false
  where id = p_doc_id;
end $$;

revoke all on function crm_soft_delete_document(uuid) from public;
grant execute on function crm_soft_delete_document(uuid) to authenticated;
