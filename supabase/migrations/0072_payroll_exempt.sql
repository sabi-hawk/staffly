-- 0072_payroll_exempt.sql — payroll now generates for anyone with earnings (a base salary, deal
-- commissions, or recurring compensation), so a commission-only partner with no base pay still gets a
-- payslip. `payroll_exempt` lets an admin exclude a specific person (e.g. the founder/CEO) from payroll
-- generation entirely, even if they have commissions. Set by admin/super like the other capability flags.
alter table profiles add column if not exists payroll_exempt boolean not null default false;
