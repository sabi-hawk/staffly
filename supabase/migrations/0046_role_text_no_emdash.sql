-- 0046: remove em dashes from the seeded role reasons/descriptions (owner: em dashes read as AI copy).
-- " — " becomes ", "; any stray "—" becomes ", ". Idempotent.
update app_roles set reason = replace(replace(reason, ' — ', ', '), '—', ', ') where reason like '%—%';
update app_roles set description = replace(replace(description, ' — ', ', '), '—', ', ') where description like '%—%';
