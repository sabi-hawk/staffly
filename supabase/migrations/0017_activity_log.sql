-- 0017_activity_log.sql — Activity Log & Audit (FRD-06). Extend audit coverage + indexes, and open
-- a SCOPED read of audit_log: super-admin sees all; admin/BD-Lead see non-financial entries; a BD
-- sees history of the CRM records they own. Financial/payroll audit stays super-admin-only.

-- ── Coverage: audit the remaining sensitive tables (idempotent) ───────────────
do $$ declare t text; begin
  foreach t in array array['employee_private','employee_credentials','commission_policies','company_settings'] loop
    if exists (select 1 from information_schema.tables where table_name = t) then
      execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
      execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function record_audit();', t);
    end if;
  end loop;
end $$;

-- ── Indexes for the Activity Log filters ──────────────────────────────────────
create index if not exists idx_audit_entity_id on audit_log(entity, entity_id);
create index if not exists idx_audit_actor on audit_log(actor_id);
create index if not exists idx_audit_action on audit_log(action);

-- ── Scoped read policy ────────────────────────────────────────────────────────
drop policy if exists audit_admin_read on audit_log;
drop policy if exists audit_super_read on audit_log;
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (
  auth_role() = 'super_admin'
  -- admin + BD-Lead: everything EXCEPT payroll/financial entries
  or (
    auth_is_bd_lead()
    and entity not in (
      'salary_structures','payroll_runs','compensation_components','payslip_components',
      'deals','deal_documents','receiving_accounts',
      'employee_private','employee_credentials','commission_policies'
    )
  )
  -- a plain BD: history of the CRM records they own (owner_bd_id carried in the row snapshot)
  or (
    entity in ('dev_profiles','leads','interviews','assessments')
    and coalesce(after->>'owner_bd_id', before->>'owner_bd_id') = auth.uid()::text
  )
);
