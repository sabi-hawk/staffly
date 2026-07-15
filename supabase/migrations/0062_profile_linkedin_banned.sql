-- 0062_profile_linkedin_banned.sql — a profile's LinkedIn can be banned independently of its status
-- (a profile may still be Active but its LinkedIn is banned). A simple flag, surfaced as a red marker
-- in the list so it's visible at a glance. The reason/context still lives in the profile's notes.
alter table dev_profiles add column if not exists linkedin_banned boolean not null default false;
