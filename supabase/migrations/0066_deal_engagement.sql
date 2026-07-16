-- 0066_deal_engagement.sql — a deal isn't always a full-time monthly hire. Capture how the client is
-- billed so the Amount reads correctly:
--   engagement_type : full_time | part_time | hourly
--   rate_type       : monthly | hourly  — how the Amount is expressed. A full-time (or part-time) hire
--                     can still be billed at an hourly wage; an 'hourly' engagement is always hourly.
--   hours           : agreed hours per week (for part-time / hourly), informational.
-- These describe the billing arrangement only; logged receipts (deal_payments, always PKR) and BD
-- commission (a % of receipts) are unaffected.
alter table deals
  add column if not exists engagement_type text not null default 'full_time'
    check (engagement_type in ('full_time','part_time','hourly')),
  add column if not exists rate_type text not null default 'monthly'
    check (rate_type in ('monthly','hourly')),
  add column if not exists hours numeric(6,2) check (hours is null or hours >= 0);
