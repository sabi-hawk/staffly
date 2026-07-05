-- 0026_employee_summary_flag.sql — admin-toggleable visibility of the attendance summary for employees.
-- When false, employees don't see their worked-days / leaves / missing / extra-deficit summary on the
-- Attendance tab (nor the deficit/extra column); admins always see it. Default ON for now (owner may
-- disable later). Read by everyone (settings_read), written by super_admin (settings_super_write).

alter table company_settings
  add column if not exists show_employee_attendance_summary boolean not null default true;
