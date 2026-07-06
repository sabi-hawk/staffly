-- 0037_rbac_fixes.sql — security-review fixes on the RBAC wiring (FRD-08), before HR/Accounts are
-- assigned to real users:
--  (1) new `crm.profiles.manage` permission (create/edit dev-profiles, manage stacks, hard-delete
--      profile docs, read the deleted-docs history) — granted to Admin + Super Admin. The last CRM
--      policies still keyed on the legacy admin enum move onto it, so an HR/Accounts user (base_role
--      'admin') can no longer write CRM via a direct SDK call.
--  (2) the privileged-cols guard now gates role/app_role_id changes on `users.assign_roles` (perm-
--      driven; still super-admin-only by default grants) instead of the raw enum.

insert into permissions (key, module, label, description) values
  ('crm.profiles.manage','CRM','Profiles (manage)','Create/edit dev-profiles, manage stacks, hard-delete profile documents.')
on conflict (key) do update set module = excluded.module, label = excluded.label, description = excluded.description;

insert into role_permissions (role_id, permission_key)
select id, 'crm.profiles.manage' from app_roles where key in ('admin','super_admin')
on conflict do nothing;

-- (1) migrate the remaining admin-enum CRM policies
drop policy if exists dev_profiles_admin_write on dev_profiles;
create policy dev_profiles_admin_write on dev_profiles for all
  using (auth_has_perm('crm.profiles.manage')) with check (auth_has_perm('crm.profiles.manage'));
drop policy if exists dev_stacks_admin_write on dev_stacks;
create policy dev_stacks_admin_write on dev_stacks for all
  using (auth_has_perm('crm.profiles.manage')) with check (auth_has_perm('crm.profiles.manage'));
drop policy if exists dev_docs_admin_delete on dev_profile_documents;
create policy dev_docs_admin_delete on dev_profile_documents for delete
  using (auth_has_perm('crm.profiles.manage'));
drop policy if exists dev_docs_select on dev_profile_documents;
create policy dev_docs_select on dev_profile_documents for select using (
  auth_has_perm('crm.profiles.manage')
  or (
    deleted_at is null
    and (
      auth_is_bd_lead()
      or exists (select 1 from dev_profiles p
                 where p.id = dev_profile_documents.dev_profile_id and p.owner_bd_id = auth.uid())
    )
  )
);

-- (2) guard trigger: role assignment keys on users.assign_roles (super-admin by default grants)
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(auth_role(), 'employee');
begin
  if auth.uid() is null then
    return NEW; -- service-role (seed / admin API / cron) — trusted
  end if;

  if v_role not in ('admin','super_admin') then
    if NEW.role              is distinct from OLD.role
    or NEW.status            is distinct from OLD.status
    or NEW.department         is distinct from OLD.department
    or NEW.department_id      is distinct from OLD.department_id
    or NEW.is_bd_lead        is distinct from OLD.is_bd_lead
    or NEW.is_developer      is distinct from OLD.is_developer
    or NEW.is_deal_developer is distinct from OLD.is_deal_developer
    or NEW.app_role_id       is distinct from OLD.app_role_id then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;

  -- role + app-role assignment require the users.assign_roles grant (Super Admin by default)
  if (NEW.role is distinct from OLD.role or NEW.app_role_id is distinct from OLD.app_role_id)
     and not auth_has_perm('users.assign_roles') then
    raise exception 'Only a role manager (users.assign_roles) can assign roles';
  end if;

  return NEW;
end $$;
