-- 0005_employee_dob.sql — date of birth on profiles (age is computed in-app from this).
alter table profiles add column if not exists date_of_birth date;
