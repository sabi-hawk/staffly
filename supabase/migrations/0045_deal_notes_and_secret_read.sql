-- 0045: deal notes + let the owning BD read a profile's account password (owner, 2026-07-08).

-- (a) free-text rich notes on a deal (the app's note-taker, like lead BD notes).
alter table deals add column if not exists notes text;

-- (b) dev_profile_secrets: the owning BD (and BD-Leads) may now READ the account password so they
-- can log in as that persona to apply — but only admins/super may SET it (existing dev_secrets_admin
-- ALL policy stays; this is an additive SELECT policy). Writes by a BD are still blocked.
drop policy if exists dev_secrets_owner_read on dev_profile_secrets;
create policy dev_secrets_owner_read on dev_profile_secrets for select
  using (
    auth_is_bd_lead()
    or exists (
      select 1 from dev_profiles p
      where p.id = dev_profile_secrets.dev_profile_id
        and p.owner_bd_id = auth.uid() and auth_is_bd()
    )
  );
