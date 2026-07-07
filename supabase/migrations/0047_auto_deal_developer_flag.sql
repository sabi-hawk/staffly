-- 0047: assigning a developer to a deal auto-sets their is_deal_developer flag (owner, 2026-07-08).
-- Sets the flag when a profile becomes a deal's working_developer OR is added to deal_developers as
-- role 'developer'. It does NOT auto-clear (they may be on other deals); an admin can unset it on the
-- employee page. Governs leave treatment (balances hidden, requests record-only). SECURITY DEFINER so
-- the flag is set regardless of who saved the deal; the actor is already super-admin (deals are theirs).

create or replace function sync_deal_developer_flag()
returns trigger language plpgsql security definer set search_path = public as $$
declare dev uuid;
begin
  if tg_table_name = 'deal_developers' then
    if NEW.role = 'developer' then dev := NEW.developer_id; end if;
  else -- deals
    dev := NEW.working_developer;
  end if;
  if dev is not null then
    update profiles set is_deal_developer = true
      where id = dev and coalesce(is_deal_developer, false) = false;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_deal_dev_flag on deal_developers;
create trigger trg_deal_dev_flag after insert on deal_developers
  for each row execute function sync_deal_developer_flag();

drop trigger if exists trg_working_dev_flag on deals;
create trigger trg_working_dev_flag after insert or update of working_developer on deals
  for each row execute function sync_deal_developer_flag();

-- backfill: flag anyone already on a deal.
update profiles p set is_deal_developer = true
where coalesce(p.is_deal_developer, false) = false
  and (
    exists (select 1 from deals d where d.working_developer = p.id)
    or exists (select 1 from deal_developers dd where dd.developer_id = p.id and dd.role = 'developer')
  );
