-- 0021_crm_lead_details.sql — lead budget/expected/job-description/notepad, assessment
-- "whom should complete", lead-level document (resume) attachments, and a Received-date backfill.

-- ── (1) leads: budget + expected (BD's ask) + job description + BD notepad (all free text/HTML).
alter table leads add column if not exists budget text;
alter table leads add column if not exists expected_budget text;
alter table leads add column if not exists job_description text;
alter table leads add column if not exists notes text;

-- ── (2) assessments: who SHOULD complete it (mirror of interviews.whom_should_give).
alter table assessments add column if not exists whom_should_complete uuid references profiles(id) on delete set null;

-- ── (3) Backfill Received dates so the (default 1-month) grid filter shows pre-existing rows.
update interviews  set received_date = created_at::date where received_date is null;
update assessments set entry_date    = created_at::date where entry_date    is null;

-- ── (4) lead_documents — resumes / files attached to a specific lead (deal). Owner-scoped like leads.
create table if not exists lead_documents (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references leads(id) on delete cascade,
  doc_type    text not null default 'resume' check (doc_type in ('resume','other')),
  label       text,
  file_path   text not null,
  file_name   text,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_lead_docs on lead_documents(lead_id);

create trigger trg_lead_documents_updated before update on lead_documents
  for each row execute function set_updated_at();
create trigger trg_audit_lead_documents after insert or update or delete on lead_documents
  for each row execute function record_audit();

alter table lead_documents enable row level security;
-- visible/editable exactly when the parent lead is (BD owner, BD-Lead, or admin/super via auth_is_bd_lead).
drop policy if exists lead_documents_scoped on lead_documents;
create policy lead_documents_scoped on lead_documents for all
  using (
    exists (
      select 1 from leads l
      where l.id = lead_documents.lead_id
        and (auth_is_bd_lead() or (l.owner_bd_id = auth.uid() and auth_is_bd()))
    )
  )
  with check (
    exists (
      select 1 from leads l
      where l.id = lead_documents.lead_id
        and (auth_is_bd_lead() or (l.owner_bd_id = auth.uid() and auth_is_bd()))
    )
  );
