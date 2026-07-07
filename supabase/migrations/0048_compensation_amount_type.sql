-- 0048: compensation category amount type (owner, 2026-07-08). Three kinds of category now:
--   recurring + fixed    → applied every month at a fixed amount (e.g. fuel allowance)
--   recurring + variable → applied every month, amount reviewed each run (stored amount = default)
--   occasional           → recurring=false; NOT auto-added; included in a payslip only when applied
alter table compensation_components add column if not exists is_fixed_amount boolean not null default true;
