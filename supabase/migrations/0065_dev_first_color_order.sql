-- 0065_dev_first_color_order.sql — developers and BDs share the profiles.color pool. Ordering it purely by
-- created_at interleaved the two groups, so the handful of developers landed on scattered palette indices
-- (e.g. blue, gold, pink, red) — pink and red look near-identical in the working-developers picker.
-- Re-colour with DEVELOPERS FIRST: developers take the most-distinct leading hues (blue → red → green →
-- orange …), then BDs continue after. Row numbers stay unique so both groups remain internally distinct and
-- no dev/BD collide. dev_stacks and dev_profiles keep their own distinct colours (0064).
with p as (
  select pr.id,
         (row_number() over (
           order by (case when pr.is_developer then 0 else 1 end), pr.created_at, pr.id
         )) - 1 as rn
  from profiles pr
  where pr.is_developer
     or exists (select 1 from app_roles r where r.id = pr.app_role_id and r.key in ('bd','bd_lead','partner_bd'))
)
update profiles set color = pick_crm_color(p.rn::int) from p where profiles.id = p.id;
