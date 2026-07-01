-- 0013_crm_leads_activity.sql — CRM Leads + Interviews + Assessments (FRD-02/03/04-leads).
-- A lead groups an opportunity's interview rounds + assessments. Owner-scoped writes: a BD manages
-- their OWN rows; BD-Leads + admin/super manage all. Developer refs = employees flagged is_developer.

-- ── Leads ─────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id            uuid primary key default uuid_generate_v4(),
  company       text not null,
  role          text,
  dev_profile_id uuid references dev_profiles(id) on delete set null,
  owner_bd_id   uuid not null references profiles(id),
  status        text not null default 'open'
                  check (status in ('open','interviewing','assessment','won','lost','disqualified')),
  disqualified_category text
                  check (disqualified_category in ('fake_job','low_pay','unpaid_collab','other')),
  disqualified_note     text,
  disqualified_by       uuid references profiles(id),
  disqualified_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_leads_owner on leads(owner_bd_id);
create index if not exists idx_leads_profile on leads(dev_profile_id);
create index if not exists idx_leads_status on leads(status);

-- ── Interviews ────────────────────────────────────────────────────────────────
create table if not exists interviews (
  id             uuid primary key default uuid_generate_v4(),
  lead_id        uuid references leads(id) on delete cascade,
  dev_profile_id uuid references dev_profiles(id) on delete set null,
  owner_bd_id    uuid not null references profiles(id),
  job_title      text,
  company        text,
  job_post_url   text,
  status         text not null default 'scheduled'
                   check (status in ('pending','scheduled','completed','cancelled')),
  given_by         uuid references profiles(id),   -- the developer who attended (is_developer)
  whom_should_give uuid references profiles(id),   -- developer for later rounds (same as round 1)
  interview_at   timestamptz,
  round          text check (round in ('1st','2nd','3rd','final')),
  outcome        text check (outcome in ('pending','selected','rejected','on_hold')),
  notes          text,
  notes2         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_interviews_owner on interviews(owner_bd_id);
create index if not exists idx_interviews_lead on interviews(lead_id);

-- ── Assessments ───────────────────────────────────────────────────────────────
create table if not exists assessments (
  id             uuid primary key default uuid_generate_v4(),
  lead_id        uuid references leads(id) on delete cascade,
  dev_profile_id uuid references dev_profiles(id) on delete set null,
  owner_bd_id    uuid not null references profiles(id),
  job_title      text,
  company        text,
  status         text not null default 'pending'
                   check (status in ('pending','in_progress','completed','cancelled')),
  entry_date     date,
  deadline       date,
  completion_date date,
  mail_subject   text,
  job_post_url   text,
  job_description text,
  completed_by   uuid references profiles(id),   -- the developer who did it (is_developer)
  priority       text check (priority in ('high','medium','low')),
  budget         text,                            -- free text ("$55-60/hr", "N/A", …)
  assessment_link text,
  duration       text,                            -- 15m|30m|45m|1h|1.5h|2h|2h+ (extendable)
  notes          text,
  extra          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_assessments_owner on assessments(owner_bd_id);
create index if not exists idx_assessments_lead on assessments(lead_id);
create index if not exists idx_assessments_deadline on assessments(deadline);

create table if not exists assessment_documents (
  id            uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  doc_type      text not null default 'extra' check (doc_type in ('resume_cv','extra')),
  label         text,
  file_path     text not null,
  file_name     text,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_assessment_docs on assessment_documents(assessment_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['leads','interviews','assessments','assessment_documents'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ── audit triggers ────────────────────────────────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['leads','interviews','assessments','assessment_documents'] loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function record_audit();', t);
  end loop;
end $$;

-- ── RLS: owner-scoped (BD manages own) + BD-Lead/admin manage all ─────────────
alter table leads                enable row level security;
alter table interviews           enable row level security;
alter table assessments          enable row level security;
alter table assessment_documents enable row level security;

-- leads / interviews / assessments: identical owner-scoped shape
do $$ declare t text; begin
  foreach t in array array['leads','interviews','assessments'] loop
    execute format('drop policy if exists %1$s_owner_select on %1$s;', t);
    execute format($f$create policy %1$s_owner_select on %1$s for select
      using (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()));$f$, t);
    execute format('drop policy if exists %1$s_owner_write on %1$s;', t);
    execute format($f$create policy %1$s_owner_write on %1$s for all
      using (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()))
      with check (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()));$f$, t);
  end loop;
end $$;

-- assessment_documents: visibility follows the parent assessment
drop policy if exists assessment_docs_select on assessment_documents;
create policy assessment_docs_select on assessment_documents for select
  using (
    auth_is_bd_lead()
    or exists (select 1 from assessments a
               where a.id = assessment_id and a.owner_bd_id = auth.uid() and auth_is_bd())
  );
drop policy if exists assessment_docs_write on assessment_documents;
create policy assessment_docs_write on assessment_documents for all
  using (
    auth_is_bd_lead()
    or exists (select 1 from assessments a
               where a.id = assessment_id and a.owner_bd_id = auth.uid() and auth_is_bd())
  )
  with check (
    auth_is_bd_lead()
    or exists (select 1 from assessments a
               where a.id = assessment_id and a.owner_bd_id = auth.uid() and auth_is_bd())
  );
