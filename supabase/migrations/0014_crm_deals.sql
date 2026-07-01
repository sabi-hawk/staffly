-- 0014_crm_deals.sql — CRM Deals (FRD-04 deals part). ADMIN/SUPER-ADMIN ONLY (financial data).
-- A deal is a landed lead: engagement + how we get paid + documents.

-- ── Managed lists ─────────────────────────────────────────────────────────────
create table if not exists receiving_accounts (
  id           uuid primary key default uuid_generate_v4(),
  holder_name  text not null,               -- e.g. the owner, his brother
  bank_name    text,
  account_number text,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists payment_methods (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into payment_methods (name, sort_order) values
  ('Direct to bank',1),('Payoneer',2),('Wise',3),('Other',4)
on conflict (name) do nothing;

-- ── Deals ─────────────────────────────────────────────────────────────────────
create table if not exists deals (
  id                uuid primary key default uuid_generate_v4(),
  lead_id           uuid references leads(id) on delete set null,
  designation       text,
  joining_date      date,
  dev_profile_id    uuid references dev_profiles(id) on delete set null,
  working_developer uuid references profiles(id),      -- may differ from the profile's person
  salary            numeric,                            -- PKR
  receiving_account_id uuid references receiving_accounts(id),
  payment_method_id uuid references payment_methods(id),
  profile_dob       date,
  status            text not null default 'active' check (status in ('active','ended','cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_deals_lead on deals(lead_id);

create table if not exists deal_documents (
  id          uuid primary key default uuid_generate_v4(),
  deal_id     uuid not null references deals(id) on delete cascade,
  label       text,
  file_path   text not null,
  file_name   text,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_deal_docs on deal_documents(deal_id);

-- ── updated_at + audit triggers ───────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['receiving_accounts','payment_methods','deals','deal_documents'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at();', t);
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function record_audit();', t);
  end loop;
end $$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table receiving_accounts enable row level security;
alter table payment_methods    enable row level security;
alter table deals              enable row level security;
alter table deal_documents     enable row level security;

-- deals / deal_documents / receiving_accounts: ADMIN + SUPER-ADMIN ONLY (no BD, no BD-Lead)
do $$ declare t text; begin
  foreach t in array array['deals','deal_documents','receiving_accounts'] loop
    execute format('drop policy if exists %1$s_admin on %1$s;', t);
    execute format($f$create policy %1$s_admin on %1$s for all
      using (auth_role() in ('admin','super_admin'))
      with check (auth_role() in ('admin','super_admin'));$f$, t);
  end loop;
end $$;

-- payment_methods: read by any authenticated user (harmless lookup); write admin/super
drop policy if exists payment_methods_read on payment_methods;
create policy payment_methods_read on payment_methods for select using (auth.uid() is not null);
drop policy if exists payment_methods_write on payment_methods;
create policy payment_methods_write on payment_methods for all
  using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));
