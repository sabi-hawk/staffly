-- 0058_deal_currency.sql — deals can be priced in different currencies (PKR / USD / EUR / AUD / …).
-- This is the CONTRACT/salary currency for display; actual receipts stay logged in PKR (deal_payments).
alter table deals add column if not exists currency text not null default 'PKR'
  check (currency in ('PKR','USD','EUR','GBP','AUD','CAD','AED'));
