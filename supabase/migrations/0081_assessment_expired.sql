-- 0081_assessment_expired.sql — allow marking an assessment as "expired" (deadline passed with no
-- submission), alongside pending / in_progress / completed / cancelled.
alter table assessments drop constraint if exists assessments_status_check;
alter table assessments add constraint assessments_status_check
  check (status in ('pending', 'in_progress', 'completed', 'cancelled', 'expired'));
