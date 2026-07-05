-- 0032_deal_directory.sql — an admin/HR-safe directory: which developer is on which deal.
-- Deals are super-admin only (0030), but HR needs to know a developer's deal assignment (NAME only,
-- never financials). This security-definer function returns deal name + developer + role for
-- admin/super callers and nothing for anyone else — so no salary/payment ever leaks to HR.

create or replace function deal_directory()
returns table(deal_id uuid, deal_name text, status text, developer_id uuid, developer_name text, role text)
language sql stable security definer set search_path = public as $$
  select d.id,
         coalesce(nullif(btrim(d.name), ''), d.designation, 'Deal') as deal_name,
         d.status,
         dd.developer_id,
         p.full_name as developer_name,
         dd.role
  from deal_developers dd
  join deals d on d.id = dd.deal_id
  join profiles p on p.id = dd.developer_id
  where auth_role() in ('admin','super_admin')   -- HR + super only; returns 0 rows for anyone else
  order by d.created_at desc, p.full_name;
$$;
revoke all on function deal_directory() from public;
grant execute on function deal_directory() to authenticated;
