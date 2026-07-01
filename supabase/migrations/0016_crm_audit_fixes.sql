-- 0016_crm_audit_fixes.sql — CRM audit follow-ups (Plans 01-03 review).

-- (1) ON DELETE SET NULL for the nullable person references, so deleting/retiring a developer or a
-- disqualifying admin doesn't get blocked by a FK violation (owner_bd_id stays NOT NULL by design).
alter table interviews  drop constraint if exists interviews_given_by_fkey;
alter table interviews  add  constraint interviews_given_by_fkey
  foreign key (given_by) references profiles(id) on delete set null;
alter table interviews  drop constraint if exists interviews_whom_should_give_fkey;
alter table interviews  add  constraint interviews_whom_should_give_fkey
  foreign key (whom_should_give) references profiles(id) on delete set null;
alter table assessments drop constraint if exists assessments_completed_by_fkey;
alter table assessments add  constraint assessments_completed_by_fkey
  foreign key (completed_by) references profiles(id) on delete set null;
alter table leads       drop constraint if exists leads_disqualified_by_fkey;
alter table leads       add  constraint leads_disqualified_by_fkey
  foreign key (disqualified_by) references profiles(id) on delete set null;

-- (2) Audit dev_stacks for consistency with the departments lookup.
drop trigger if exists trg_audit_dev_stacks on dev_stacks;
create trigger trg_audit_dev_stacks after insert or update or delete on dev_stacks
  for each row execute function record_audit();
