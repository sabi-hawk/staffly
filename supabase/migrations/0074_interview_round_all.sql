-- 0074_interview_round_all.sql — 0013 limited interviews.round to 1st/2nd/3rd/final, but when onboarding
-- an existing lead a BD may need to record a LATER round (e.g. a 4th call) without the earlier rounds
-- existing in the portal. Widen the check to the full set the UI offers (INTERVIEW_ROUND: 1st–8th, final).
alter table interviews drop constraint if exists interviews_round_check;
alter table interviews add constraint interviews_round_check
  check (round is null or round in ('1st','2nd','3rd','4th','5th','6th','7th','8th','final'));
