-- 0027_daily_summary.sql — per-day task summary written by the employee (rich text, like BD notes).
-- One summary per attendance day. Editable the same day; once the day passes it locks (if present) or
-- may be added late (flagged). `summary_at` = when it was last saved; `summary_late` = added after the
-- work_date. Lives on the per-day `attendance` row (self-updatable via the existing att_update policy).

alter table attendance
  add column if not exists daily_summary text,
  add column if not exists summary_at    timestamptz,
  add column if not exists summary_late   boolean not null default false;
