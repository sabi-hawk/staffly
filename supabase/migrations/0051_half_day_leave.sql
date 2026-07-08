-- 0051: half-day leave + casual→unpaid fallback (owner, 2026-07-08).
-- A leave can now be a HALF day (0.5), primarily under casual: the 1-day monthly casual allowance can be
-- split into two half-days on different days. Half-days beyond the casual allowance fall to unpaid (the
-- app asks the employee to confirm the unpaid fallback first). days_count becomes numeric to hold 0.5.
alter table leave_requests alter column days_count type numeric(4,1) using days_count::numeric(4,1);
alter table leave_requests add column if not exists half_day boolean not null default false;
alter table leave_requests add column if not exists half_period text
  check (half_period is null or half_period in ('first', 'second'));

-- A half-day is a single date; keep the data honest.
alter table leave_requests drop constraint if exists leave_half_day_single;
alter table leave_requests add constraint leave_half_day_single
  check (not half_day or (start_date = end_date and days_count = 0.5));
