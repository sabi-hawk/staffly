-- 0020_crm_leads_redesign.sql — FRD-07: lead-status remodel, per-record feedback,
-- editable "received" date, and admin alerts on lead close.

-- ── (1) leads: remodel status (activity → pipeline outcome) + add feedback.
alter table leads drop constraint if exists leads_status_check;
update leads set status = case status
  when 'open'          then 'in_progress'
  when 'interviewing'  then 'in_progress'
  when 'assessment'    then 'in_progress'
  when 'won'           then 'closed'
  when 'lost'          then 'rejected'
  when 'disqualified'  then 'dismissed'
  else status end;
alter table leads add constraint leads_status_check
  check (status in ('in_progress','on_hold','closed','rejected','dismissed'));
alter table leads alter column status set default 'in_progress';
alter table leads add column if not exists feedback text;

-- ── (2) interviews: editable email-received date (default today) + feedback.
alter table interviews add column if not exists received_date date;
alter table interviews add column if not exists feedback text;

-- ── (3) assessments: feedback (existing entry_date is relabelled "Received" in the UI).
alter table assessments add column if not exists feedback text;

-- ── (4) crm_alerts — admin-facing notifications. Trigger-inserted only; admin/super read + mark-read.
create table if not exists crm_alerts (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null default 'lead_closed' check (type in ('lead_closed')),
  lead_id     uuid references leads(id) on delete cascade,
  actor_bd_id uuid references profiles(id) on delete set null,
  company     text,
  message     text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists idx_crm_alerts_created on crm_alerts(created_at desc);
alter table crm_alerts enable row level security;

-- admin/super only: read + update (mark-read). No client INSERT policy → inserts come solely from the
-- SECURITY DEFINER trigger below (a BD can never forge an alert).
drop policy if exists crm_alerts_admin_read on crm_alerts;
create policy crm_alerts_admin_read on crm_alerts for select
  using (auth_role() in ('admin','super_admin'));
drop policy if exists crm_alerts_admin_update on crm_alerts;
create policy crm_alerts_admin_update on crm_alerts for update
  using (auth_role() in ('admin','super_admin'))
  with check (auth_role() in ('admin','super_admin'));

-- Raise exactly one alert when a lead transitions INTO 'closed'.
create or replace function crm_alert_on_lead_closed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  if NEW.status = 'closed' and OLD.status is distinct from 'closed' then
    select full_name into v_actor from profiles where id = NEW.owner_bd_id;
    insert into crm_alerts (type, lead_id, actor_bd_id, company, message)
    values ('lead_closed', NEW.id, NEW.owner_bd_id, NEW.company,
            coalesce(v_actor, 'A BD') || ' closed a lead — '
              || coalesce(nullif(NEW.company, ''), '(no company)') || ' — review.');
  end if;
  return NEW;
end $$;
drop trigger if exists trg_crm_alert_lead_closed on leads;
create trigger trg_crm_alert_lead_closed after update of status on leads
  for each row execute function crm_alert_on_lead_closed();
