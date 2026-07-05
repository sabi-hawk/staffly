-- 0025_lead_contacts.sql — company-side contact details logged against a lead (owner feedback).
-- Purpose: BDs optionally record the CLIENT company's representatives (HR / recruiter / admin / hiring
-- manager / other) — email, phone, LinkedIn — so we can reach back out to past leads during dry spells.
-- Owner-scoped exactly like the parent lead (BD owner, BD-Lead, or admin/super).

create table if not exists lead_contacts (
  id           uuid primary key default uuid_generate_v4(),
  lead_id      uuid not null references leads(id) on delete cascade,
  contact_type text not null default 'hr'
               check (contact_type in ('hr','recruiter','company_admin','hiring_manager','other')),
  other_type   text,           -- free-text role when contact_type = 'other'
  name         text,
  email        text,
  phone        text,
  linkedin_url text,
  note         text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_lead_contacts on lead_contacts(lead_id);

create trigger trg_lead_contacts_updated before update on lead_contacts
  for each row execute function set_updated_at();
create trigger trg_audit_lead_contacts after insert or update or delete on lead_contacts
  for each row execute function record_audit();

alter table lead_contacts enable row level security;
-- visible/editable exactly when the parent lead is (BD owner, BD-Lead, or admin/super via auth_is_bd_lead).
drop policy if exists lead_contacts_scoped on lead_contacts;
create policy lead_contacts_scoped on lead_contacts for all
  using (
    exists (
      select 1 from leads l
      where l.id = lead_contacts.lead_id
        and (auth_is_bd_lead() or (l.owner_bd_id = auth.uid() and auth_is_bd()))
    )
  )
  with check (
    exists (
      select 1 from leads l
      where l.id = lead_contacts.lead_id
        and (auth_is_bd_lead() or (l.owner_bd_id = auth.uid() and auth_is_bd()))
    )
  );
