-- 0038_analytics_closed_leads.sql — (1) BD Performance becomes admin/super-only via a REGRANT (the
-- RBAC way: revoke crm.analytics.view from BD/BD Lead — nav/middleware/page all follow the grant).
-- (2) CLOSED leads (deal won) are masked from BD/BD Lead at the DB: details visible only to holders of
-- the new `crm.leads.closed` (Admin + Super Admin). BDs keep the COUNT of their own closed deals via
-- my_closed_deals_count() so the track record stays visible.

-- (1) analytics: admin/super only
delete from role_permissions
where permission_key = 'crm.analytics.view'
  and role_id in (select id from app_roles where key in ('bd','bd_lead'));

-- (2) closed-lead visibility permission
insert into permissions (key, module, label, description) values
  ('crm.leads.closed','CRM','Closed leads (details)','See the full details of CLOSED (won) leads. Without it, closed leads are hidden — only their count remains visible to the owning BD.')
on conflict (key) do update set module = excluded.module, label = excluded.label, description = excluded.description;
insert into role_permissions (role_id, permission_key)
select id, 'crm.leads.closed' from app_roles where key in ('admin','super_admin')
on conflict do nothing;

-- leads: split the FOR ALL policy (it implicitly granted SELECT) and add the closed mask.
drop policy if exists leads_owner_select on leads;
create policy leads_owner_select on leads for select using (
  (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()))
  and (status <> 'closed' or auth_has_perm('crm.leads.closed'))
);
drop policy if exists leads_owner_write on leads;
create policy leads_owner_insert on leads for insert
  with check (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()));
create policy leads_owner_update on leads for update
  using (
    (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()))
    and (status <> 'closed' or auth_has_perm('crm.leads.closed'))   -- once closed, only admin+ may edit
  )
  with check (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd())); -- closing itself is allowed
create policy leads_owner_delete on leads for delete
  using (
    (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()))
    and (status <> 'closed' or auth_has_perm('crm.leads.closed'))
  );

-- the owning BD's closed-deal count (track record without the details)
create or replace function my_closed_deals_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from leads where owner_bd_id = auth.uid() and status = 'closed';
$$;
revoke all on function my_closed_deals_count() from public;
grant execute on function my_closed_deals_count() to authenticated;
