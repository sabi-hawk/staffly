-- 0056_worktype_hybrid.sql — add a third work type. Employees can be onsite, remote, or now hybrid.
-- (Postgres 12+ allows ADD VALUE inside a transaction as long as the value isn't USED in the same tx.)
alter type employment_type add value if not exists 'hybrid';
