-- seed.sql — Test data (PRD §8).
-- Auth users (with these exact UUIDs + password Test@12345) must be created FIRST via
-- supabase.auth.admin.createUser (see scripts/seed.mjs). Then this file runs.

-- ---------- company settings ----------
insert into company_settings (id, company_name) values (1, 'Acme Startup')
on conflict (id) do nothing;

-- ---------- profiles (ids must match auth.users) ----------
-- handle_new_user() may have already inserted a base row on signup; reconcile fields here.
insert into profiles (id, full_name, email, role, employment_type, position, department, joining_date) values
('00000000-0000-0000-0000-000000000001','Founder Admin','founder@acme.test','super_admin','onsite','Founder','Exec','2024-01-01'),
('00000000-0000-0000-0000-000000000002','Hira HR','hr@acme.test','admin','onsite','HR Manager','People','2024-02-01'),
('00000000-0000-0000-0000-000000000011','Ali Dev','ali@acme.test','employee','onsite','Senior Developer','Engineering','2024-03-01'),
('00000000-0000-0000-0000-000000000012','Sara Dev','sara@acme.test','employee','remote','Developer','Engineering','2024-04-01'),
('00000000-0000-0000-0000-000000000013','Bilal BD','bilal@acme.test','employee','onsite','BD Executive','Sales','2024-03-15'),
('00000000-0000-0000-0000-000000000014','Zara BD','zara@acme.test','employee','remote','BD Executive','Sales','2024-05-01'),
('00000000-0000-0000-0000-000000000015','Omar Ops','omar@acme.test','employee','onsite','Operations','Ops','2024-02-10')
on conflict (id) do update set
  full_name=excluded.full_name, email=excluded.email, role=excluded.role,
  employment_type=excluded.employment_type, position=excluded.position,
  department=excluded.department, joining_date=excluded.joining_date;

-- ---------- shifts (10:00-19:00 = 9h expected) ----------
delete from shifts where employee_id in (
  '00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015');
insert into shifts (employee_id, start_time, end_time, days_of_week, checkin_buffer_minutes) values
('00000000-0000-0000-0000-000000000011','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000012','11:00','20:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000013','10:00','19:00','{1,2,3,4,5}',60),
('00000000-0000-0000-0000-000000000014','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000015','09:00','18:00','{1,2,3,4,5}',60);

-- ---------- salary structures ----------
delete from salary_structures where employee_id in (
  '00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015');
insert into salary_structures (employee_id, type, base_salary, overtime_rate_hour, commission_rate, benefits) values
('00000000-0000-0000-0000-000000000011','fixed_plus_overtime',200000, 800, 0, '[{"label":"Medical","amount":10000}]'),
('00000000-0000-0000-0000-000000000012','fixed',180000,0,0,'[]'),
('00000000-0000-0000-0000-000000000013','commission',60000,0,5,'[{"label":"Transport","amount":8000}]'),
('00000000-0000-0000-0000-000000000014','commission',60000,0,5,'[]'),
('00000000-0000-0000-0000-000000000015','fixed',120000,0,0,'[{"label":"Transport","amount":8000}]');

-- ---------- leave balances (current year) ----------
insert into leave_balances (employee_id, year, annual_total, annual_used, casual_month, casual_used)
select id, extract(year from now())::int, 8, 0, extract(month from now())::int, 0
from profiles where role = 'employee'
on conflict (employee_id, year, casual_month) do nothing;

-- ---------- attendance: Ali, last 5 working days ----------
delete from attendance where employee_id = '00000000-0000-0000-0000-000000000011';
insert into attendance (employee_id, work_date, check_in_time, check_out_time, expected_hours) values
('00000000-0000-0000-0000-000000000011', current_date - 7, (current_date-7)+time '10:00', (current_date-7)+time '19:00',9),
('00000000-0000-0000-0000-000000000011', current_date - 6, (current_date-6)+time '10:00', (current_date-6)+time '21:00',9),
('00000000-0000-0000-0000-000000000011', current_date - 5, (current_date-5)+time '10:00', (current_date-5)+time '17:30',9),
('00000000-0000-0000-0000-000000000011', current_date - 4, (current_date-4)+time '10:05', null,9),
('00000000-0000-0000-0000-000000000011', current_date - 3, (current_date-3)+time '10:00', (current_date-3)+time '19:00',9);

-- ---------- a pending annual leave + an unpaid leave ----------
delete from leave_requests where employee_id in (
  '00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000013');
insert into leave_requests (employee_id, type, start_date, end_date, days_count, reason, status) values
('00000000-0000-0000-0000-000000000012','annual', current_date + 14, current_date + 16, 3, 'Family trip','pending'),
('00000000-0000-0000-0000-000000000013','unpaid', current_date - 2, current_date - 2, 1, 'Personal','approved');

-- ---------- a holiday ----------
insert into holidays (name, holiday_date, year)
values ('Independence Day', date_trunc('year', now())::date + interval '225 days', extract(year from now())::int)
on conflict do nothing;
