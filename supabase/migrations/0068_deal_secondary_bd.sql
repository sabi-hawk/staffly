-- 0068_deal_secondary_bd.sql — a deal can have TWO BD owners: primary + secondary. The primary is the
-- direct BD who owns the deal; the secondary is typically the BD-Lead who trained the junior and, per
-- company policy, earns a commission on the junior's deal too. Both BDs get their own commission % via the
-- existing per-employee deal_commissions (each employee ↔ deal row carries its own rate) — this column
-- just records the ownership so the secondary BD is visible on the deal.
alter table deals
  add column if not exists secondary_owner_bd_id uuid references profiles(id) on delete set null;
