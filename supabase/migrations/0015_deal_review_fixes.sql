-- 0015_deal_review_fixes.sql — review fixes for CRM Deals (0014).

-- (1) salary must be non-negative (financial input validation).
alter table deals add constraint deals_salary_nonneg check (salary is null or salary >= 0);

-- (2) ON DELETE SET NULL for the three FKs that lacked it — so deleting a payment method / receiving
-- account / developer doesn't throw a FK violation (the deal just loses that reference).
alter table deals drop constraint if exists deals_working_developer_fkey;
alter table deals add constraint deals_working_developer_fkey
  foreign key (working_developer) references profiles(id) on delete set null;

alter table deals drop constraint if exists deals_receiving_account_id_fkey;
alter table deals add constraint deals_receiving_account_id_fkey
  foreign key (receiving_account_id) references receiving_accounts(id) on delete set null;

alter table deals drop constraint if exists deals_payment_method_id_fkey;
alter table deals add constraint deals_payment_method_id_fkey
  foreign key (payment_method_id) references payment_methods(id) on delete set null;
