-- 0080_interview_round_name.sql — a SEMANTIC name for the interview round (e.g. "Initial call",
-- "Technical round 1", "Architectural round", "Cultural round"), separate from the ordinal round
-- (1st/2nd/…). Free text so a BD can pick a common preset OR type a new one; used in the calendar
-- event title and the shared/copied details.
alter table interviews add column if not exists round_name text;
