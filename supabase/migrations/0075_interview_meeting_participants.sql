-- 0075_interview_meeting_participants.sql — two fields BDs need on an interview:
--   meeting_link : the Zoom / Google Meet / other join link for the call.
--   participants : the people on the call besides us (client-side interviewers, panel members). A repeatable
--                  list of { name, note } — the note holds their designation, LinkedIn URL or any contact
--                  info. Stored as JSONB so a BD can add as many as needed without a join table.
alter table interviews
  add column if not exists meeting_link text,
  add column if not exists participants jsonb not null default '[]'::jsonb;
