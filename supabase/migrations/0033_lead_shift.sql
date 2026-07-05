-- 0033_lead_shift.sql — an optional shift note on a lead (sometimes the shift is known in advance).
-- Free text (e.g. "US EST, 6pm–2am PKT" or "flexible") — no fixed structure needed.
alter table leads add column if not exists shift text;
