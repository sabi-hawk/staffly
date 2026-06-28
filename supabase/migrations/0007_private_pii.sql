-- 0007_private_pii.sql — move sensitive PII off `profiles` (which everyone can read) into a
-- locked-down `employee_private` table. Fixes: any authenticated user could read all colleagues'
-- CNIC + bank details via the anon key (profiles_read = using(true) is row-level, not column-level).

create table if not exists employee_private (
  employee_id         uuid primary key references profiles(id) on delete cascade,
  cnic                text,
  bank_account_number text,
  bank_account_title  text,
  bank_name           text,
  iban                text,
  updated_at          timestamptz not null default now()
);

-- migrate existing values from profiles (if the columns still exist)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='cnic') then
    insert into employee_private (employee_id, cnic, bank_account_number, bank_account_title, bank_name, iban)
    select id, cnic, bank_account_number, bank_account_title, bank_name, iban from profiles
    on conflict (employee_id) do update set
      cnic=excluded.cnic, bank_account_number=excluded.bank_account_number,
      bank_account_title=excluded.bank_account_title, bank_name=excluded.bank_name, iban=excluded.iban;
  end if;
end $$;

alter table profiles drop column if exists cnic;
alter table profiles drop column if exists bank_account_number;
alter table profiles drop column if exists bank_account_title;
alter table profiles drop column if exists bank_name;
alter table profiles drop column if exists iban;

drop trigger if exists trg_employee_private_updated on employee_private;
create trigger trg_employee_private_updated before update on employee_private
  for each row execute function set_updated_at();

drop trigger if exists trg_audit_employee_private on employee_private;
create trigger trg_audit_employee_private after insert or update or delete on employee_private
  for each row execute function record_audit();

alter table employee_private enable row level security;
-- read: the employee themselves, or super admin. write: super admin only.
drop policy if exists emp_private_read on employee_private;
create policy emp_private_read on employee_private
  for select using (employee_id = auth.uid() or auth_role() = 'super_admin');
drop policy if exists emp_private_write on employee_private;
create policy emp_private_write on employee_private
  for all using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');
