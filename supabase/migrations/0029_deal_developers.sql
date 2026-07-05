-- 0029_deal_developers.sql — a deal name + many-to-many developer/closer assignment on deals.
-- A developer can be on many deals; a deal can have many developers; a person can be the closer and/or
-- the developer of a deal. Deals themselves stay admin/super-only (0014); a developer can see ONLY the
-- NAME of deals they're assigned to (via the my_deals() definer function) — never the financials.

alter table deals add column if not exists name text;

create table if not exists deal_developers (
  id           uuid primary key default uuid_generate_v4(),
  deal_id      uuid not null references deals(id) on delete cascade,
  developer_id uuid not null references profiles(id) on delete cascade,
  role         text not null default 'developer' check (role in ('developer','closer')),
  created_at   timestamptz not null default now(),
  unique (deal_id, developer_id, role)
);
create index if not exists idx_deal_devs_deal on deal_developers(deal_id);
create index if not exists idx_deal_devs_dev on deal_developers(developer_id);

create trigger trg_deal_developers_audit after insert or update or delete on deal_developers
  for each row execute function record_audit();

alter table deal_developers enable row level security;
-- admin/super manage the assignments; a developer may READ their own assignment rows.
drop policy if exists deal_devs_admin on deal_developers;
create policy deal_devs_admin on deal_developers for all
  using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));
drop policy if exists deal_devs_self_read on deal_developers;
create policy deal_devs_self_read on deal_developers for select
  using (developer_id = auth.uid());

-- The caller's assigned deals — NAME + role only (no salary/payment). Security-definer so a developer
-- can see the deal name without the deals table (admin-only) being readable to them.
create or replace function my_deals()
returns table(deal_id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select d.id, coalesce(nullif(btrim(d.name), ''), d.designation, 'Deal') as name, dd.role
  from deal_developers dd
  join deals d on d.id = dd.deal_id
  where dd.developer_id = auth.uid()
  order by d.created_at desc;
$$;
revoke all on function my_deals() from public;
grant execute on function my_deals() to authenticated;
