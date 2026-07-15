-- 0059_crm_colors_sim_owner.sql — CRM enhancements:
--  • dev_profiles.sim_owner: who owns the SIM for the profile's mobile (free text; may be a non-employee)
--  • a stable COLOUR per BD (profiles.color) and per stack (dev_stacks.color) so the same person/stack
--    reads in one glance across dropdowns, grids and the calendar. Auto-assigned from a curated palette;
--    a super admin can recolour later. Palette chosen for contrast on white and a calm CRM look.

alter table dev_profiles add column if not exists sim_owner text;
alter table profiles    add column if not exists color text;
alter table dev_stacks  add column if not exists color text;

-- curated palette (readable as text on white, visually distinct)
create or replace function crm_color_palette() returns text[] language sql immutable as $$
  select array['#2563eb','#059669','#7c3aed','#d97706','#e11d48','#0891b2',
               '#4f46e5','#0d9488','#c026d3','#65a30d','#ea580c','#0284c7']
$$;

-- pick a palette colour (round-robin-ish by current row count, so early rows spread out)
create or replace function pick_crm_color(p_count int) returns text language sql immutable as $$
  select (crm_color_palette())[ (p_count % array_length(crm_color_palette(),1)) + 1 ]
$$;

-- backfill existing stacks + BD profiles in a stable order
with s as (select id, (row_number() over (order by sort_order, name)) - 1 as rn from dev_stacks where color is null)
update dev_stacks d set color = pick_crm_color(s.rn::int) from s where d.id = s.id;

with b as (
  select p.id, (row_number() over (order by p.created_at, p.id)) - 1 as rn
  from profiles p join app_roles r on r.id = p.app_role_id
  where r.key in ('bd','bd_lead','partner_bd') and p.color is null
)
update profiles p set color = pick_crm_color(b.rn::int) from b where p.id = b.id;

-- new stacks: assign a colour on insert when none given
create or replace function assign_stack_color() returns trigger language plpgsql as $$
begin
  if new.color is null then
    new.color := pick_crm_color((select count(*)::int from dev_stacks));
  end if;
  return new;
end $$;
drop trigger if exists trg_stack_color on dev_stacks;
create trigger trg_stack_color before insert on dev_stacks for each row execute function assign_stack_color();

-- new/updated BD profiles: assign a colour when they become a BD and don't have one yet
create or replace function assign_bd_color() returns trigger language plpgsql as $$
begin
  if new.color is null and exists (
    select 1 from app_roles r where r.id = new.app_role_id and r.key in ('bd','bd_lead','partner_bd')
  ) then
    new.color := pick_crm_color((select count(*)::int from profiles where color is not null));
  end if;
  return new;
end $$;
drop trigger if exists trg_bd_color on profiles;
create trigger trg_bd_color before insert or update of app_role_id on profiles for each row execute function assign_bd_color();
