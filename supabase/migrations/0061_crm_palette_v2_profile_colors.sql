-- 0061_crm_palette_v2_profile_colors.sql — a fresher, more modern CRM colour palette + colours for
-- dev-profiles and developers (closers). Re-assigns existing stacks/BDs and adds profiles + developers.

-- refined palette (rich, readable-as-text on white, harmonious — replaces the 0059 set)
create or replace function crm_color_palette() returns text[] language sql immutable as $$
  select array['#5925DC','#0E9384','#C11574','#DC6803','#026AA2','#7A5AF8',
               '#099250','#E31B54','#0BA5EC','#6938EF','#DD2590','#4E5BA6']
$$;

alter table dev_profiles add column if not exists color text;

-- re-colour stacks
with s as (select id, (row_number() over (order by sort_order, name)) - 1 as rn from dev_stacks)
update dev_stacks d set color = pick_crm_color(s.rn::int) from s where d.id = s.id;

-- re-colour every BD OR developer profile (both render coloured: BD owner, closer, working devs)
with b as (
  select p.id, (row_number() over (order by p.created_at, p.id)) - 1 as rn
  from profiles p
  where p.is_developer or exists (select 1 from app_roles r where r.id = p.app_role_id and r.key in ('bd','bd_lead','partner_bd'))
)
update profiles p set color = pick_crm_color(b.rn::int) from b where p.id = b.id;

-- colour every dev-profile (so the deals grid can tint the profile column)
with dp as (select id, (row_number() over (order by profile_no, created_at)) - 1 as rn from dev_profiles)
update dev_profiles d set color = pick_crm_color(dp.rn::int) from dp where d.id = dp.id;

-- new dev-profiles get a colour on insert
create or replace function assign_dev_profile_color() returns trigger language plpgsql as $$
begin
  if new.color is null then new.color := pick_crm_color((select count(*)::int from dev_profiles)); end if;
  return new;
end $$;
drop trigger if exists trg_dev_profile_color on dev_profiles;
create trigger trg_dev_profile_color before insert on dev_profiles for each row execute function assign_dev_profile_color();

-- extend the profile-colour trigger to colour DEVELOPERS too (not just BDs), on insert or on a change
-- to app_role_id / is_developer.
create or replace function assign_bd_color() returns trigger language plpgsql as $$
begin
  if new.color is null and (new.is_developer or exists (
    select 1 from app_roles r where r.id = new.app_role_id and r.key in ('bd','bd_lead','partner_bd')
  )) then
    new.color := pick_crm_color((select count(*)::int from profiles where color is not null));
  end if;
  return new;
end $$;
drop trigger if exists trg_bd_color on profiles;
create trigger trg_bd_color before insert or update of app_role_id, is_developer on profiles for each row execute function assign_bd_color();
