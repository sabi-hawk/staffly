-- 0031_deal_developer_flag.sql — mark an employee as a DEAL-ASSIGNED developer.
-- Such a developer's leave is governed by the client company they work for, so in our portal we DON'T
-- show them annual/casual balances, and their leave requests are record-only (pending → admin marks).
-- Set by admin/super (guarded from non-admins, like the other privileged flags).

alter table profiles add column if not exists is_deal_developer boolean not null default false;

-- extend the privileged-column guard (0019) to protect the new flag.
create or replace function guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(auth_role(), 'employee');
begin
  if auth.uid() is null then
    return NEW; -- service-role (seed / admin API / cron) — trusted
  end if;

  -- non-admins: cannot change any privileged column on their own row
  if v_role not in ('admin','super_admin') then
    if NEW.role              is distinct from OLD.role
    or NEW.status            is distinct from OLD.status
    or NEW.department         is distinct from OLD.department
    or NEW.department_id      is distinct from OLD.department_id
    or NEW.is_bd_lead        is distinct from OLD.is_bd_lead
    or NEW.is_developer      is distinct from OLD.is_developer
    or NEW.is_deal_developer is distinct from OLD.is_deal_developer then
      raise exception 'Not allowed to modify privileged profile columns';
    end if;
  end if;

  -- ANYONE below super_admin (incl. admin) cannot change `role`; role management is super_admin-only.
  if v_role <> 'super_admin' and NEW.role is distinct from OLD.role then
    raise exception 'Only a super-admin can change a role';
  end if;

  return NEW;
end $$;
