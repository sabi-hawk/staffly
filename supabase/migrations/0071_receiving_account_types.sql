-- 0071_receiving_account_types.sql — a "receiving account" is any mechanism money lands in: a bank
-- account, Payoneer, Wise, or Western Union. This merges the old separate "payment method" idea into the
-- account itself (the account's TYPE is the method). Each type needs different fields, so add them all
-- (nullable); the UI shows only the ones relevant to the chosen type.
--   bank            → bank_name, account_number, iban, swift_code, branch_code, branch_address
--   payoneer / wise → email
--   western_union   → holder_name (recipient identity) + cnic
-- receiving_accounts stays admin/super-admin only (deals scope), so the WU recipient CNIC is not exposed
-- to employees/BDs.
alter table receiving_accounts
  add column if not exists type text not null default 'bank'
    check (type in ('bank','payoneer','wise','western_union','other')),
  add column if not exists label          text,   -- optional friendly name
  add column if not exists email          text,   -- payoneer / wise
  add column if not exists iban           text,   -- bank
  add column if not exists swift_code     text,   -- bank
  add column if not exists branch_code    text,   -- bank
  add column if not exists branch_address text,   -- bank
  add column if not exists cnic           text;   -- western union recipient identity

-- existing rows were all bank accounts (the only kind the old form supported).
update receiving_accounts set type = 'bank' where type is null;
