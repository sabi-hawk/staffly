-- 0079_interview_duration.sql — interview length in minutes, so a scheduled call has a real end time
-- (start + duration) instead of assuming 60. Drives the Google Calendar event's end time.
alter table interviews
  add column if not exists duration_min integer not null default 60
    check (duration_min > 0 and duration_min <= 600);
