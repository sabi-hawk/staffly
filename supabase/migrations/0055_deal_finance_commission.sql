-- 0055_deal_finance_commission.sql — deal payment ledger + BD deal-commission on payslips.
-- Owner rule (2026-07-12): a deal's incoming money is logged as a ledger of receipts, each keyed to a
-- BILLING MONTH (which can differ from the date it physically arrived — e.g. received 2 Aug, billed to
-- July). A BD earns a commission on a deal as a % of that deal's receipts billed to the payroll period,
-- or a one-off fixed amount. The payslip shows the BD only "Commission — {Company}: amount"; the admin
-- view carries the full breakdown. Both tables are FINANCIAL → the tightest RLS (super-admin / comp).

-- ── deal_payments: actual money received against a deal ────────────────────────────────────────────
create table if not exists deal_payments (
  id            uuid primary key default uuid_generate_v4(),
  deal_id       uuid not null references deals(id) on delete cascade,
  amount        numeric not null,                   -- PKR that actually landed (post-conversion)
  received_on   date not null,                      -- when the money arrived
  billing_month date not null,                      -- first-of-month it counts toward (e.g. 2026-07-01)
  note          text,                               -- e.g. "$2,000 via Wise"
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(), -- entry date (when it was logged)
  updated_at    timestamptz not null default now()
);
create index if not exists idx_deal_payments_deal  on deal_payments(deal_id);
create index if not exists idx_deal_payments_month on deal_payments(billing_month);

-- ── deal_commissions: a BD's cut of a deal — % of receipts OR a one-off fixed amount ───────────────
create table if not exists deal_commissions (
  id           uuid primary key default uuid_generate_v4(),
  employee_id  uuid not null references profiles(id) on delete cascade,  -- the BD
  deal_id      uuid not null references deals(id) on delete cascade,
  rate         numeric(5,2),        -- percent of receipts (null when fixed_amount is used)
  fixed_amount numeric,             -- one-off fixed PKR (null when rate is used)
  label        text,                -- optional display override; default "Commission — {company}"
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint deal_commission_basis check (
    (rate is not null and fixed_amount is null) or (rate is null and fixed_amount is not null)
  )
);
create index if not exists idx_deal_commissions_emp on deal_commissions(employee_id);

-- Mark a payslip line as a deal commission, so a future BD-facing payslip can render only its label +
-- amount and hide the admin breakdown that rides in `description` (rate / total received).
alter table payslip_components add column if not exists is_commission boolean not null default false;

-- ── updated_at + audit triggers ────────────────────────────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['deal_payments','deal_commissions'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at();', t);
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function record_audit();', t);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────────────
alter table deal_payments    enable row level security;
alter table deal_commissions enable row level security;

-- deal_payments = deal financials → super-admin only (mirrors deals, 0030).
drop policy if exists deal_payments_super on deal_payments;
create policy deal_payments_super on deal_payments for all
  using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- deal_commissions = compensation config → compensation.manage (mirrors compensation_components, 0036).
drop policy if exists deal_commissions_perm on deal_commissions;
create policy deal_commissions_perm on deal_commissions for all
  using (auth_has_perm('compensation.manage')) with check (auth_has_perm('compensation.manage'));

-- Keep both new financial tables out of the ops-viewer arm of the audit log (super/financial only).
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (
  auth_has_perm('activity.view_financial')
  or (auth_has_perm('activity.view_ops')
      and entity <> all (array['salary_structures','payroll_runs','compensation_components',
        'payslip_components','deals','deal_documents','receiving_accounts','employee_private',
        'employee_credentials','commission_policies','deal_payments','deal_commissions']))
  or (auth_is_bd()
      and entity = any (array['dev_profiles','leads','interviews','assessments'])
      and coalesce(after->>'owner_bd_id', before->>'owner_bd_id') = auth.uid()::text)
);
