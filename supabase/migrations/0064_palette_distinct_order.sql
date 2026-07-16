-- 0064_palette_distinct_order.sql — the 0063 palette started red→orange→amber (three warm tones), so a
-- small category (2-4 items) got near-identical colours. Reorder to MAXIMALLY-DISTINCT hues so the first
-- assignments are blue → red → green → orange → purple → teal → pink (very different at a glance), and
-- re-colour everything.
create or replace function crm_color_palette() returns text[] language sql immutable as $$
  select array['#2563EB','#DC2626','#16A34A','#EA580C','#9333EA','#0D9488',
               '#DB2777','#CA8A04','#4F46E5','#65A30D','#0891B2','#C026D3']
$$;

with s as (select id, (row_number() over (order by sort_order, name)) - 1 as rn from dev_stacks)
update dev_stacks d set color = pick_crm_color(s.rn::int) from s where d.id = s.id;

with b as (
  select p.id, (row_number() over (order by p.created_at, p.id)) - 1 as rn
  from profiles p
  where p.is_developer or exists (select 1 from app_roles r where r.id = p.app_role_id and r.key in ('bd','bd_lead','partner_bd'))
)
update profiles p set color = pick_crm_color(b.rn::int) from b where p.id = b.id;

with dp as (select id, (row_number() over (order by profile_no, created_at)) - 1 as rn from dev_profiles)
update dev_profiles d set color = pick_crm_color(dp.rn::int) from dp where d.id = dp.id;
