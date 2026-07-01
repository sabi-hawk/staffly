-- 0018_audit_rls_fix.sql — review fix: the BD arm of audit_read must also require BD membership,
-- mirroring the data-table policies (a non-BD whose UUID an admin set as owner_bd_id must NOT read
-- that record's audit history).
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (
  auth_role() = 'super_admin'
  or (
    auth_is_bd_lead()
    and entity not in (
      'salary_structures','payroll_runs','compensation_components','payslip_components',
      'deals','deal_documents','receiving_accounts',
      'employee_private','employee_credentials','commission_policies'
    )
  )
  or (
    auth_is_bd()
    and entity in ('dev_profiles','leads','interviews','assessments')
    and coalesce(after->>'owner_bd_id', before->>'owner_bd_id') = auth.uid()::text
  )
);
