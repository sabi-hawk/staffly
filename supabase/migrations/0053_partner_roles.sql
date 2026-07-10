-- 0053: partner roles (owner, 2026-07-10). The founder-partners (Ali Ahmad, Sabahat Atique) come OFF
-- super_admin onto a limited "Partner (Developer)" role; a BD-partner (Mohiudin Ghazi) gets "Partner
-- (BD)". Partners have CRM visibility + the power to hard-delete/restore interviews & assessments (like
-- super could) but NO attendance/leave/summary obligations and NO finance/deals/settings/roles access.
-- They keep base role 'employee' (so they appear in People + are payable via compensation) and are
-- flagged is_partner (highlighted in the Employees list). super_admin stays a dedicated separate account.

-- ── partner flag ──────────────────────────────────────────────────────────────
alter table profiles add column if not exists is_partner boolean not null default false;

-- ── new permission: hard-delete/restore CRM interviews & assessments ──────────
insert into permissions (key, module, label, description) values
  ('crm.records.delete', 'CRM', 'Delete CRM records', 'Hard-delete or restore interviews & assessments (what super admin could do).')
on conflict (key) do update set module = excluded.module, label = excluded.label, description = excluded.description;

-- ── the two partner roles (system roles; base_role employee so they list + are payable) ──
insert into app_roles (key, name, description, reason, is_system, base_role) values
  ('partner_dev', 'Partner (Developer)',
   'A founding developer-partner: full CRM visibility and the power to manage/delete interviews & assessments, with no attendance/leave/summary duties and no finance, deals, settings or user-management access.',
   'Created for the developer-partners Ali Ahmad and Sabahat Atique — they need to run the CRM (leads, interviews, assessments) without holding super-admin (which would expose deals/financials if a session is left open).',
   true, 'employee'),
  ('partner_bd', 'Partner (BD)',
   'A founding BD-partner: full BD-Lead reach across all BDs'' leads/interviews/assessments (add, update, delete), with no check-in/holiday duties and no finance, deals, settings or user-management access.',
   'Created for the BD-partner Mohiudin Ghazi — he runs the BD pipeline like a BD Lead but, as a partner, without attendance obligations and without super-admin.',
   true, 'employee')
on conflict (key) do update set name = excluded.name, description = excluded.description, reason = excluded.reason, base_role = excluded.base_role;

-- ── grants (replace-all for just these roles, so re-running self-heals) ────────
do $$
declare
  partner_dev text[] := array[
    'dashboard.self','profile.self','calendar.view','announcements.view','handbook.view',
    'crm.access','crm.profiles.all','crm.profiles.docs','crm.leads.all','crm.leads.closed',
    'crm.contacts','crm.calendar.view','crm.analytics.view','crm.records.delete'];
  partner_bd text[] := array[
    'dashboard.self','profile.self','calendar.view','announcements.view','handbook.view',
    'crm.access','crm.profiles.own','crm.profiles.all','crm.profiles.docs','crm.leads.own','crm.leads.all',
    'crm.leads.closed','crm.contacts','crm.calendar.view','crm.analytics.view','activity.view_ops','crm.records.delete'];
  r record;
begin
  for r in select id, key from app_roles where key in ('partner_dev','partner_bd') loop
    delete from role_permissions where role_id = r.id;
    if r.key = 'partner_dev' then insert into role_permissions (role_id, permission_key) select r.id, unnest(partner_dev) on conflict do nothing; end if;
    if r.key = 'partner_bd'  then insert into role_permissions (role_id, permission_key) select r.id, unnest(partner_bd)  on conflict do nothing; end if;
  end loop;
end $$;
-- super_admin keeps every permission (its grants were seeded before this key existed) — add explicitly.
insert into role_permissions (role_id, permission_key)
  select id, 'crm.records.delete' from app_roles where key = 'super_admin' on conflict do nothing;

-- ── CRM hard-delete: super_admin OR crm.records.delete (was super_admin only, 0049) ──
do $$ declare t text; begin
  foreach t in array array['interviews','assessments'] loop
    execute format('drop policy if exists %1$s_super_delete on %1$s;', t);
    execute format($f$create policy %1$s_super_delete on %1$s for delete
      using (auth_role() = 'super_admin' or auth_has_perm('crm.records.delete'));$f$, t);
  end loop;
end $$;
drop policy if exists leads_super_delete on leads;
create policy leads_super_delete on leads for delete
  using (auth_role() = 'super_admin' or auth_has_perm('crm.records.delete'));

-- ── restore (un-dismiss) guard: allow super_admin OR crm.records.delete (was super only) ──
create or replace function crm_guard_undismiss()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dismissed_at is distinct from old.dismissed_at then
    -- a plain BD may only go NULL → a timestamp (dismiss). Clearing/re-stamping needs super_admin or the
    -- crm.records.delete permission (the partner roles).
    if auth_role() <> 'super_admin' and not auth_has_perm('crm.records.delete')
       and not (old.dismissed_at is null and new.dismissed_at is not null) then
      raise exception 'Only a super admin or a CRM manager can restore or change a dismissed record';
    end if;
    if old.dismissed_at is null and new.dismissed_at is not null then
      new.dismissed_by := auth.uid();
    end if;
    if new.dismissed_at is null then
      new.dismissed_by := null;
      new.dismiss_reason := null;
    end if;
  end if;
  return new;
end $$;
