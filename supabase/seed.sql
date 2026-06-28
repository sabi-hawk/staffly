-- seed.sql — Softonoma v2 seed data.
-- Auth users (2 admins + 7 real employees) are created FIRST by scripts/seed.mjs with the
-- exact UUIDs below; then this file fills profiles + shifts + salaries + compensation +
-- ~90 days of attendance + leaves. Canonical test subject = Muzammal Faiz (...0026).

-- ---------- company settings ----------
insert into company_settings (id, company_name, annual_leave_quota, casual_leave_quota) values (1, 'Softonoma', 8, 2)
on conflict (id) do update set company_name = excluded.company_name,
  annual_leave_quota = excluded.annual_leave_quota, casual_leave_quota = excluded.casual_leave_quota;

-- ---------- profiles ----------
-- Admins log in by email; employees by username. Only Shaiza is remote. DOB not provided → null.
insert into profiles (id, full_name, email, username, email_secondary, role, employee_code, gender,
                      employment_type, position, department, phone, joining_date) values
('00000000-0000-0000-0000-000000000001','Super Admin','super.admin@softonoma.com',null,null,'super_admin','1001','male','onsite','Founder','Exec',null,null),
('00000000-0000-0000-0000-000000000002','HR Admin','admin@softonoma.com',null,null,'admin','1002','female','onsite','HR Manager','People',null,null),
('00000000-0000-0000-0000-000000000021','Shaiza Maheen','029755shaizamaheen@gmail.com','shaiza.maheen','shaiza.softonoma@gmail.com','employee','1042','female','remote','Business Developer','Business Development','03084761857','2025-12-15'),
('00000000-0000-0000-0000-000000000022','Ahmad Roshan','ahmad.roshi5@gmail.com','ahmad.roshan','softonomaahmad@gmail.com','employee','2087','male','onsite','Sr. Business Executive','Business Development','03227707911','2026-04-27'),
('00000000-0000-0000-0000-000000000023','Fatima Sultan','fatimasul89@gmail.com','fatima.sultan','fatima.softonoma21@gmail.com','employee','3310','female','onsite','Jr. Business Executive','Business Development','03298041475','2026-05-05'),
('00000000-0000-0000-0000-000000000024','Areeba Zaidi','areebazaidi027@gmail.com','areeba.zaidi','areebasoftonoma@gmail.com','employee','4765','female','onsite','Internee Business Developer','Business Development','03425807691','2026-05-21'),
('00000000-0000-0000-0000-000000000025','Muhammad Aizaz Ansab','muhammad.aizaz0900@gmail.com','aizaz.ansab',null,'employee','5028','male','onsite','Software Engineer','Engineering','03090464711','2025-12-08'),
('00000000-0000-0000-0000-000000000026','Muzammal Faiz','muzammilfaiz.dev@gmail.com','muzammil.faiz',null,'employee','6193','male','onsite','Sr. Software Engineer','Engineering','03304014980','2026-02-24'),
('00000000-0000-0000-0000-000000000027','Muhammad Hamza Ilyas','hamzailyas311@gmail.com','hamza.ilyas',null,'employee','7451','male','onsite','UI/UX Designer','Design','03210191191','2026-02-02')
on conflict (id) do update set
  full_name=excluded.full_name, email=excluded.email, username=excluded.username,
  email_secondary=excluded.email_secondary, role=excluded.role, employee_code=excluded.employee_code,
  gender=excluded.gender, employment_type=excluded.employment_type, position=excluded.position,
  department=excluded.department, phone=excluded.phone, joining_date=excluded.joining_date,
  date_of_birth=null;

-- ---------- sensitive PII (employee_private): CNIC + real bank details from payslips ----------
-- Areeba's bank details not provided yet → left empty.
insert into employee_private (employee_id, cnic, bank_account_number, bank_account_title, bank_name) values
('00000000-0000-0000-0000-000000000021','35202-7141090-8','04017901146003','Maheen AA','HBL'),
('00000000-0000-0000-0000-000000000022','34301-4655288-9','04770010098164920015','Ahmad Roshan','Allied Bank'),
('00000000-0000-0000-0000-000000000023','35201-5693384-6','02380115291490','Fatima Sultan','Meezan Bank'),
('00000000-0000-0000-0000-000000000024','35201-6414871-0','03417394972','Asifa Zaidi','Jazzcash'),
('00000000-0000-0000-0000-000000000025','35202-4978893-7','PK94MEZN0011360112270126','Muhammad Aizaz Ansab','Meezan Bank'),
('00000000-0000-0000-0000-000000000026','36501-2156016-9','00661010185171','Muzammal Faiz','Bank Alfalah'),
('00000000-0000-0000-0000-000000000027','35201-3736870-3','04771009527101','Muhammad Hamza Ilyas','Bank Alfalah')
on conflict (employee_id) do update set cnic=excluded.cnic,
  bank_account_number=excluded.bank_account_number, bank_account_title=excluded.bank_account_title,
  bank_name=excluded.bank_name, iban=null;

-- ---------- portal credentials (password = Softonoma@<employee_code>) ----------
insert into employee_credentials (employee_id, portal_password) values
('00000000-0000-0000-0000-000000000021','Softonoma@1042'),
('00000000-0000-0000-0000-000000000022','Softonoma@2087'),
('00000000-0000-0000-0000-000000000023','Softonoma@3310'),
('00000000-0000-0000-0000-000000000024','Softonoma@4765'),
('00000000-0000-0000-0000-000000000025','Softonoma@5028'),
('00000000-0000-0000-0000-000000000026','Softonoma@6193'),
('00000000-0000-0000-0000-000000000027','Softonoma@7451')
on conflict (employee_id) do update set portal_password=excluded.portal_password;

-- ---------- BD commission policies (sheet col K) ----------
delete from commission_policies where employee_id between '00000000-0000-0000-0000-000000000021'
  and '00000000-0000-0000-0000-000000000027';
insert into commission_policies (employee_id, label, rate, description) values
('00000000-0000-0000-0000-000000000021','Own deals', 4, 'Commission on her own closed deals'),
('00000000-0000-0000-0000-000000000021','Moon''s deals', 2, 'On Moon''s business (not an employee)'),
('00000000-0000-0000-0000-000000000022','Own deals', 3, 'Commission on his own closed deals'),
('00000000-0000-0000-0000-000000000022','Junior deals', 1, 'On deals by juniors he trains'),
('00000000-0000-0000-0000-000000000023','Own deals', 2, 'Commission on her own closed deals'),
('00000000-0000-0000-0000-000000000024','Own deals', 2, 'Commission on her own closed deals');

-- ---------- shifts (per-employee) ----------
delete from shifts where employee_id >= '00000000-0000-0000-0000-000000000021'
  and employee_id <= '00000000-0000-0000-0000-000000000027';
insert into shifts (employee_id, start_time, end_time, days_of_week, checkin_buffer_minutes) values
('00000000-0000-0000-0000-000000000021','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000022','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000023','10:00','19:00','{1,2,3,4,5}',60),
('00000000-0000-0000-0000-000000000024','11:00','16:00','{1,2,3,4,5}',60),
('00000000-0000-0000-0000-000000000025','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000026','10:00','19:00','{1,2,3,4,5}',90),
('00000000-0000-0000-0000-000000000027','10:00','18:00','{1,2,3,4,5}',60);

-- ---------- salary structures (base only; additions are dynamic) ----------
delete from salary_structures where employee_id >= '00000000-0000-0000-0000-000000000021'
  and employee_id <= '00000000-0000-0000-0000-000000000027';
insert into salary_structures (employee_id, type, base_salary, currency) values
('00000000-0000-0000-0000-000000000021','fixed', 70000,'PKR'),
('00000000-0000-0000-0000-000000000022','fixed',130000,'PKR'),
('00000000-0000-0000-0000-000000000023','fixed', 50000,'PKR'),
('00000000-0000-0000-0000-000000000024','fixed', 20000,'PKR'),
('00000000-0000-0000-0000-000000000025','fixed',100000,'PKR'),
('00000000-0000-0000-0000-000000000026','fixed',150000,'PKR'),
('00000000-0000-0000-0000-000000000027','fixed', 70000,'PKR');

-- ---------- dynamic compensation components ----------
delete from compensation_components where employee_id >= '00000000-0000-0000-0000-000000000021'
  and employee_id <= '00000000-0000-0000-0000-000000000027';
-- only the sheet's conditional engineer bonuses (col K); non-recurring so they are NOT auto-applied
-- to payroll — recorded as available one-off categories the super admin can add when earned.
insert into compensation_components (employee_id, label, amount, description, recurring) values
('00000000-0000-0000-0000-000000000025','Investment bonus', 50000,'50,000 (invesp) — per sheet', false),
('00000000-0000-0000-0000-000000000026','Extra-hours bonus', 50000,'50,000 if he gives 4 extra hours daily', false);

-- ---------- leave balances (current year + month) ----------
insert into leave_balances (employee_id, year, annual_total, annual_used, casual_month, casual_used)
select id, extract(year from now())::int, 8, 0, extract(month from now())::int, 0
from profiles where role = 'employee'
on conflict (employee_id, year, casual_month) do nothing;

-- ---------- ~90 days of attendance (weekdays, excl. holidays) ----------
do $$
declare
  emp record; shift record;
  d int; wd date; cin timestamptz; cout timestamptz; exp numeric; r numeric;
  muzammal uuid := '00000000-0000-0000-0000-000000000026';
begin
  for emp in select p.id, p.joining_date from profiles p where p.role = 'employee' loop
    select * into shift from shifts s where s.employee_id = emp.id and s.is_active limit 1;
    if shift is null then continue; end if;
    exp := round(extract(epoch from (shift.end_time - shift.start_time))/3600.0, 2);
    delete from attendance where employee_id = emp.id;
    for d in 0..89 loop
      wd := current_date - d;
      if wd < coalesce(emp.joining_date, current_date - 89) then continue; end if;
      if extract(dow from wd) in (0,6) then continue; end if;
      if exists (select 1 from holidays h where h.holiday_date = wd) then continue; end if;
      -- canonical subject: leave the last 14 days for the deterministic block below
      if emp.id = muzammal and d < 14 then continue; end if;
      r := random();
      if r < 0.08 then continue; end if;  -- ~8% absent (missing day)
      cin := wd + shift.start_time + ((floor(random()*16) - 3) || ' minute')::interval;
      if r < 0.13 then  -- ~5% missed checkout (open row)
        insert into attendance (employee_id, work_date, check_in_time, expected_hours, status)
        values (emp.id, wd, cin, exp, 'present') on conflict do nothing;
        continue;
      end if;
      if r < 0.33 then       -- overtime
        cout := wd + shift.end_time + ((1 + floor(random()*3)) || ' hour')::interval;
      elsif r < 0.53 then    -- deficit
        cout := wd + shift.end_time - ((30 + floor(random()*4)*30) || ' minute')::interval;
      else                   -- ~normal
        cout := wd + shift.end_time + ((floor(random()*20) - 10) || ' minute')::interval;
      end if;
      insert into attendance (employee_id, work_date, check_in_time, check_out_time, expected_hours, status)
      values (emp.id, wd, cin, cout, exp,
              (case when cin > wd + shift.start_time + (shift.checkin_buffer_minutes || ' minute')::interval
                   then 'late' else 'present' end)::attendance_status)
      on conflict do nothing;
    end loop;
  end loop;

  -- canonical last-5-working-days pattern for Muzammal (used by §14 tests):
  -- normal 9h / overtime 11h (+2) / deficit 7.5h (-1.5) / missed checkout / normal 9h
  insert into attendance (employee_id, work_date, check_in_time, check_out_time, expected_hours) values
  (muzammal, current_date-7, (current_date-7)+time '10:00', (current_date-7)+time '19:00',9),
  (muzammal, current_date-6, (current_date-6)+time '10:00', (current_date-6)+time '21:00',9),
  (muzammal, current_date-5, (current_date-5)+time '10:00', (current_date-5)+time '17:30',9),
  (muzammal, current_date-4, (current_date-4)+time '10:05', null,9),
  (muzammal, current_date-3, (current_date-3)+time '10:00', (current_date-3)+time '19:00',9);
end $$;

-- ---------- some leave requests ----------
delete from leave_requests where employee_id >= '00000000-0000-0000-0000-000000000021'
  and employee_id <= '00000000-0000-0000-0000-000000000027';
insert into leave_requests (employee_id, type, start_date, end_date, days_count, reason, status, approved_at) values
('00000000-0000-0000-0000-000000000022','annual', current_date + 23, current_date + 25, 3, 'Family trip','pending', null),
('00000000-0000-0000-0000-000000000021','unpaid', date_trunc('month', current_date)::date + 9, date_trunc('month', current_date)::date + 9, 1, 'Personal','approved', now()),
('00000000-0000-0000-0000-000000000023','casual', date_trunc('month', current_date)::date + 4, date_trunc('month', current_date)::date + 4, 1, 'Appointment','approved', now());

-- ---------- a holiday ----------
insert into holidays (name, holiday_date, year)
values ('Independence Day', (extract(year from now())::int || '-08-14')::date, extract(year from now())::int)
on conflict do nothing;
