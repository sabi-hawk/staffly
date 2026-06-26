-- 0001_init.sql — Extensions, enums, core + supporting tables, indexes (PRD §5)

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role         as enum ('employee', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type employment_type   as enum ('onsite', 'remote');
exception when duplicate_object then null; end $$;
do $$ begin
  create type employee_status   as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;
do $$ begin
  create type attendance_status as enum ('present','late','half_day','absent','on_leave');
exception when duplicate_object then null; end $$;
do $$ begin
  create type leave_type        as enum ('annual', 'casual', 'unpaid');
exception when duplicate_object then null; end $$;
do $$ begin
  create type leave_status      as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type salary_type       as enum ('fixed','fixed_plus_overtime','commission');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payroll_status    as enum ('draft','finalised');
exception when duplicate_object then null; end $$;
do $$ begin
  create type alert_type        as enum ('missed_checkin','missed_checkout','late_arrival','overtime_warning');
exception when duplicate_object then null; end $$;

-- profiles (extends auth.users)
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text not null unique,
  role            user_role not null default 'employee',
  avatar_url      text,
  phone           text,
  cnic            text,                       -- national ID, admin-only visibility
  position        text,                       -- job title
  department      text,
  reports_to      uuid references profiles(id),
  employment_type employment_type not null default 'onsite',
  status          employee_status not null default 'active',
  joining_date    date,
  emergency_name  text,
  emergency_phone text,
  emergency_relation text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_status on profiles(status);

-- shifts
create table if not exists shifts (
  id             uuid primary key default uuid_generate_v4(),
  employee_id    uuid not null references profiles(id) on delete cascade,
  start_time     time not null,
  end_time       time not null,
  days_of_week   int[] not null default '{1,2,3,4,5}',  -- 0=Sun .. 6=Sat
  checkin_buffer_minutes int not null default 90,
  effective_from date not null default current_date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_shifts_employee on shifts(employee_id) where is_active;

-- attendance
create table if not exists attendance (
  id                uuid primary key default uuid_generate_v4(),
  employee_id       uuid not null references profiles(id) on delete cascade,
  work_date         date not null,
  check_in_time     timestamptz,
  check_out_time    timestamptz,
  check_in_source   text,
  check_out_source  text,
  status            attendance_status not null default 'present',
  work_log          jsonb,                   -- Tiptap JSON document
  expected_hours    numeric(5,2),            -- snapshot of shift duration that day
  total_hours       numeric(5,2),            -- computed on checkout (trigger)
  deficit_hours     numeric(5,2) not null default 0,
  extra_hours       numeric(5,2) not null default 0,
  is_edited         boolean not null default false,
  edited_by         uuid references profiles(id),
  edit_reason       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists idx_att_employee_date on attendance(employee_id, work_date desc);
create index if not exists idx_att_open on attendance(employee_id)
  where check_out_time is null and check_in_time is not null;

-- leave_requests
create table if not exists leave_requests (
  id           uuid primary key default uuid_generate_v4(),
  employee_id  uuid not null references profiles(id) on delete cascade,
  type         leave_type not null,
  start_date   date not null,
  end_date     date not null,
  days_count   int not null,
  reason       text,
  status       leave_status not null default 'pending',
  approved_by  uuid references profiles(id),
  approved_at  timestamptz,
  decision_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists idx_leave_employee on leave_requests(employee_id, start_date desc);
create index if not exists idx_leave_status on leave_requests(status) where status = 'pending';

-- leave_balances
create table if not exists leave_balances (
  id            uuid primary key default uuid_generate_v4(),
  employee_id   uuid not null references profiles(id) on delete cascade,
  year          int not null,
  annual_total  int not null default 8,
  annual_used   int not null default 0,
  casual_month  int not null,
  casual_used   int not null default 0,
  unpaid_used   int not null default 0,
  updated_at    timestamptz not null default now(),
  unique (employee_id, year, casual_month)
);

-- salary_structures (Super Admin only)
create table if not exists salary_structures (
  id                 uuid primary key default uuid_generate_v4(),
  employee_id        uuid not null references profiles(id) on delete cascade,
  type               salary_type not null default 'fixed',
  base_salary        numeric(12,2) not null default 0,
  commission_rate    numeric(5,2) default 0,
  overtime_rate_hour numeric(10,2) default 0,
  benefits           jsonb not null default '[]',
  currency           text not null default 'PKR',
  effective_from     date not null default current_date,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_salary_employee on salary_structures(employee_id) where is_active;

-- payroll_runs (Super Admin only)
create table if not exists payroll_runs (
  id              uuid primary key default uuid_generate_v4(),
  employee_id     uuid not null references profiles(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  working_days    int not null default 0,
  days_present    int not null default 0,
  unpaid_days     int not null default 0,
  total_hours     numeric(7,2) not null default 0,
  total_extra_hours numeric(7,2) not null default 0,
  total_deficit_hours numeric(7,2) not null default 0,
  base_salary     numeric(12,2) not null default 0,
  overtime_pay    numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  benefits_total  numeric(12,2) not null default 0,
  deductions      numeric(12,2) not null default 0,
  net_pay         numeric(12,2) not null default 0,
  status          payroll_status not null default 'draft',
  notes           text,
  generated_by    uuid references profiles(id),
  finalised_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (employee_id, period_start, period_end)
);

-- Supporting tables
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null, body jsonb not null,
  author_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists holidays (
  id uuid primary key default uuid_generate_v4(),
  name text not null, holiday_date date not null unique, year int not null
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  label text not null, file_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists alerts_log (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references profiles(id) on delete cascade,
  type alert_type not null, message text,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz, email_sent boolean not null default false
);

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null, entity_id uuid,
  before jsonb, after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists company_settings (
  id int primary key default 1,
  company_name text not null default 'Your Company',
  annual_leave_quota int not null default 8,
  casual_leave_quota int not null default 1,
  default_checkin_buffer int not null default 90,
  missed_checkout_grace_hours int not null default 1,
  overtime_warning_hours int not null default 2,
  check (id = 1)
);
