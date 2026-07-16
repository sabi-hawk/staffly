-- 0063_distinct_colors_closer_flag.sql
--  1) A more DISTINCT palette (the 0061 set had 3 near-identical purples) and GUARANTEED-unique colours
--     within each category (dev_profiles, BD/developer profiles, stacks) — no two share a colour until
--     the palette is exhausted, even after deletions.
--  2) `profiles.is_closer` — only people flagged as a closer appear in the deal Closer picker. Backfilled
--     from whoever is already a closer on a deal.

-- 12 evenly-spread, visually distinct hues (readable as chip text on white)
create or replace function crm_color_palette() returns text[] language sql immutable as $$
  select array['#DC2626','#EA580C','#D97706','#65A30D','#16A34A','#0D9488',
               '#0891B2','#2563EB','#4F46E5','#7C3AED','#C026D3','#DB2777']
$$;

-- pick a palette colour NOT already in `used`; if all are used, round-robin by count
create or replace function pick_free_color(used text[]) returns text language sql stable as $$
  select coalesce(
    (select c from unnest(crm_color_palette()) c where not (c = any(coalesce(used, '{}'::text[]))) limit 1),
    (crm_color_palette())[ (coalesce(array_length(used, 1), 0) % array_length(crm_color_palette(), 1)) + 1 ]
  )
$$;

-- ── re-colour everything, distinct within each category (row_number → distinct up to 12) ────────────
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

-- ── triggers now assign a FREE colour (unused in the category) on insert ────────────────────────────
create or replace function assign_stack_color() returns trigger language plpgsql as $$
begin
  if new.color is null then
    new.color := pick_free_color(array(select color from dev_stacks where color is not null));
  end if;
  return new;
end $$;

create or replace function assign_dev_profile_color() returns trigger language plpgsql as $$
begin
  if new.color is null then
    new.color := pick_free_color(array(select color from dev_profiles where color is not null));
  end if;
  return new;
end $$;

create or replace function assign_bd_color() returns trigger language plpgsql as $$
begin
  if new.color is null and (new.is_developer or exists (
    select 1 from app_roles r where r.id = new.app_role_id and r.key in ('bd','bd_lead','partner_bd')
  )) then
    new.color := pick_free_color(array(select color from profiles where color is not null));
  end if;
  return new;
end $$;

-- ── closer eligibility ──────────────────────────────────────────────────────────────────────────────
alter table profiles add column if not exists is_closer boolean not null default false;
update profiles set is_closer = true where id in (select distinct closer_id from deals where closer_id is not null);
