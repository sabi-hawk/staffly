-- 0004_softonoma_v2.sql — Softonoma v2: employee fields, bank details, dynamic compensation,
-- payslip line-items, and payroll payment tracking.

-- ---------- profiles: identity, second contacts, bank/account details ----------
alter table profiles add column if not exists employee_code text unique;
alter table profiles add column if not exists email_secondary text;
alter table profiles add column if not exists gender text;          -- 'male' | 'female' | null
alter table profiles add column if not exists bank_account_number text;
alter table profiles add column if not exists bank_account_title text;
alter table profiles add column if not exists bank_name text;
alter table profiles add column if not exists iban text;
create index if not exists idx_profiles_code on profiles(employee_code);

-- ---------- dynamic compensation components (Super Admin only) ----------
create table if not exists compensation_components (
  id           uuid primary key default uuid_generate_v4(),
  employee_id  uuid not null references profiles(id) on delete cascade,
  label        text not null,                 -- e.g. "Fuel Allowance", "Deal Commission"
  amount       numeric(12,2) not null default 0,
  description  text,                           -- why/when it was decided
  recurring    boolean not null default true,  -- recurring monthly vs one-off
  is_active    boolean not null default true,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_comp_employee on compensation_components(employee_id) where is_active;

-- ---------- payroll_runs: payment tracking + additions total ----------
alter table payroll_runs add column if not exists additions_total numeric(12,2) not null default 0;
alter table payroll_runs add column if not exists payment_status text not null default 'pending'; -- pending | paid
alter table payroll_runs add column if not exists paid_at timestamptz;
alter table payroll_runs add column if not exists paid_amount numeric(12,2);
alter table payroll_runs add column if not exists credited_account text;

-- ---------- payslip line items (per run, editable/deletable on a specific payslip) ----------
create table if not exists payslip_components (
  id              uuid primary key default uuid_generate_v4(),
  payroll_run_id  uuid not null references payroll_runs(id) on delete cascade,
  label           text not null,
  amount          numeric(12,2) not null default 0,
  kind            text not null default 'addition',  -- 'base' | 'addition' | 'deduction'
  description     text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_payslip_run on payslip_components(payroll_run_id);

-- ---------- updated_at triggers for new tables ----------
drop trigger if exists trg_comp_updated on compensation_components;
create trigger trg_comp_updated before update on compensation_components
  for each row execute function set_updated_at();

-- ---------- RLS: compensation + payslip components are Super Admin only ----------
alter table compensation_components enable row level security;
alter table payslip_components      enable row level security;

drop policy if exists comp_super_only on compensation_components;
create policy comp_super_only on compensation_components
  for all using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

drop policy if exists payslip_super_only on payslip_components;
create policy payslip_super_only on payslip_components
  for all using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');
