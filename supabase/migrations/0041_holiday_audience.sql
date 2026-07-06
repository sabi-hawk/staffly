-- 0041: holiday audiences (owner, 2026-07-06).
-- A holiday can target the whole company (department_ids null) or specific departments, and can
-- include/exclude deal-assigned developers (their calendar is governed by the client company).
-- Applicability affects BOTH visibility (dashboard/calendar) and working-day math (attendance
-- expectations, leave day counts, payroll missing-day deductions) via working_days().

alter table holidays add column if not exists department_ids uuid[] null;
alter table holidays add column if not exists include_deal_developers boolean not null default true;
-- existing rows: department_ids null + include true = company-wide for everyone (behaviour unchanged)

-- Two scoped holidays may now share a date (e.g. BD-only + Design-only) — the global unique date
-- constraint has to go; keep (date, name) unique so exact duplicates are still rejected.
alter table holidays drop constraint if exists holidays_holiday_date_key;
create unique index if not exists holidays_date_name_uniq on holidays (holiday_date, name);

-- Holidays that apply to one employee, in range. Security invoker: holidays are world-readable and
-- profiles are readable by all authenticated users, so callers (self, admin, payroll) all pass RLS.
create or replace function employee_holidays(p_employee uuid, p_from date, p_to date)
returns setof holidays language sql stable as $$
  select h.*
  from holidays h
  join profiles p on p.id = p_employee
  where h.holiday_date between p_from and p_to
    and (h.department_ids is null or p.department_id = any(h.department_ids))
    and (h.include_deal_developers or not coalesce(p.is_deal_developer, false))
  order by h.holiday_date;
$$;

-- working_days: the holiday exclusion is now audience-aware (same predicate as employee_holidays).
create or replace function working_days(p_employee uuid, p_start date, p_end date)
returns int language sql stable as $$
  with d as (select generate_series(p_start, p_end, interval '1 day')::date dt)
  select count(*)::int
  from d
  join shifts s on s.employee_id = p_employee and s.is_active
  join profiles p on p.id = p_employee
  where extract(dow from d.dt)::int = any(s.days_of_week)
    and not exists (
      select 1 from holidays h
      where h.holiday_date = d.dt
        and (h.department_ids is null or p.department_id = any(h.department_ids))
        and (h.include_deal_developers or not coalesce(p.is_deal_developer, false))
    );
$$;
