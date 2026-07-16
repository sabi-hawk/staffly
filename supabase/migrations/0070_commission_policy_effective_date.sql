-- 0070_commission_policy_effective_date.sql — a commission policy applies FROM a given date. A BD's
-- percentage can change over time (this rate since date X, an earlier rate before it), so record when
-- each policy takes effect. Nullable: existing policies keep no date until edited; the timeline is read
-- by ordering on effective_date (each policy applies until the next one's effective date).
alter table commission_policies add column if not exists effective_date date;
