-- 0057_deal_fields.sql — deals get a Closer + optional BD owner, a stable 4-digit code, and the lead
-- link becomes truly optional (already a nullable FK; the app validation is what's being relaxed).
-- A company can have several deals sharing the same name, so the code is what identifies each one.

-- who CLOSED the deal (from the people/developer pool) and which BD owns it (both optional references).
alter table deals add column if not exists closer_id   uuid references profiles(id) on delete set null;
alter table deals add column if not exists owner_bd_id uuid references profiles(id) on delete set null;

-- memorable 4-digit deal code (like dev-profile numbers, 0043): auto-assigned, unique, hand-editable.
create sequence if not exists deal_code_seq start 1001;
alter table deals add column if not exists deal_code int;

with numbered as (
  select id, 1000 + row_number() over (order by created_at, id) as rn
  from deals where deal_code is null
)
update deals d set deal_code = n.rn from numbered n where d.id = n.id;

select setval('deal_code_seq', coalesce((select max(deal_code) from deals), 1000) + 1, false);

alter table deals alter column deal_code set default nextval('deal_code_seq');
alter table deals alter column deal_code set not null;
create unique index if not exists deals_deal_code_uniq on deals (deal_code);

create index if not exists idx_deals_owner_bd on deals (owner_bd_id);
create index if not exists idx_deals_closer on deals (closer_id);
