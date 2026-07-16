-- 0067_profile_is_designer.sql — some deals are design work, not development. Mark an employee as a
-- DESIGNER so they can be assigned to a deal as a working member: the deal Working-members picker shows
-- developers OR designers. Kept separate from is_developer (which gates the interview/assessment
-- "given by" picker) so designers don't wrongly appear as interviewers.
alter table profiles add column if not exists is_designer boolean not null default false;
