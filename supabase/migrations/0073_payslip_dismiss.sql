-- 0073_payslip_dismiss.sql — a payslip line can be DISMISSED (e.g. a missing-attendance deduction the
-- admin judges invalid in an early month). A dismissed line is kept for the record (shown struck through)
-- but excluded from the run's totals and from the printed payslip. Draft runs only; recompute skips them.
alter table payslip_components add column if not exists dismissed boolean not null default false;
