-- 0023_dev_docs_history_scope.sql — restrict soft-deleted document visibility + drop a dead RPC.
-- Follow-up to 0022: the "Deleted (history)" list is admin-only, so the SELECT policy must hide
-- soft-deleted rows from BD owners / BD-Leads (0011's policy had no deleted_at filter — a BD could
-- read their own soft-deleted docs directly via the SDK). Admin/super still see everything.

drop policy if exists dev_docs_select on dev_profile_documents;
create policy dev_docs_select on dev_profile_documents
  for select using (
    auth_role() in ('admin','super_admin')
    or (
      deleted_at is null
      and (
        auth_is_bd_lead()
        or exists (select 1 from dev_profiles p
                   where p.id = dev_profile_id and p.owner_bd_id = auth.uid())
      )
    )
  );

-- Dead code: superseded by the app service setPrimaryDocument() (which also allows the owning BD via
-- RLS). The old RPC hard-coded an admin-only check and is no longer called anywhere.
drop function if exists crm_set_primary_document(uuid);
