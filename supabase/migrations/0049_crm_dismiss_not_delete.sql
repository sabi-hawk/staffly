-- 0049: BD dismiss-not-delete for CRM activity records (owner, 2026-07-08).
-- A BD may only DISMISS an interview/assessment (soft-hide, crossed out, kept for audit); only a
-- super admin can RESTORE (un-dismiss) or HARD-DELETE. Leads already soft-hide via status='dismissed';
-- here we (a) add dismiss columns to interviews + assessments, (b) tighten DELETE on
-- leads/interviews/assessments to super_admin only, (c) let owners UPDATE (so a BD can dismiss) but
-- block any non-super from clearing/altering dismissed_at via a trigger (so a BD can never restore).

-- ── (a) dismiss columns ───────────────────────────────────────────────────────
alter table interviews  add column if not exists dismissed_at   timestamptz;
alter table interviews  add column if not exists dismissed_by   uuid references profiles(id);
alter table interviews  add column if not exists dismiss_reason text;
alter table assessments add column if not exists dismissed_at   timestamptz;
alter table assessments add column if not exists dismissed_by   uuid references profiles(id);
alter table assessments add column if not exists dismiss_reason text;

-- ── (b) split the combined owner_write (for all) into insert/update (owner) + delete (super) ──
-- interviews + assessments: BD-owner / BD-Lead may insert & update their rows (update = dismiss);
-- only a super admin may hard-delete.
do $$ declare t text; begin
  foreach t in array array['interviews','assessments'] loop
    execute format('drop policy if exists %1$s_owner_write on %1$s;', t);
    execute format('drop policy if exists %1$s_owner_insert on %1$s;', t);
    execute format('drop policy if exists %1$s_owner_update on %1$s;', t);
    execute format('drop policy if exists %1$s_super_delete on %1$s;', t);
    execute format($f$create policy %1$s_owner_insert on %1$s for insert
      with check (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()));$f$, t);
    execute format($f$create policy %1$s_owner_update on %1$s for update
      using (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()))
      with check (auth_is_bd_lead() or (owner_bd_id = auth.uid() and auth_is_bd()));$f$, t);
    execute format($f$create policy %1$s_super_delete on %1$s for delete
      using (auth_role() = 'super_admin');$f$, t);
  end loop;
end $$;

-- leads: replace the combined owner_write (still active from 0013) with a super-only delete. 0038
-- defined leads_owner_insert (kept) + leads_owner_delete (owner, non-closed) — drop the latter: leads
-- now delete super-only, matching interviews/assessments. Owners still dismiss a lead via status.
drop policy if exists leads_owner_write  on leads;
drop policy if exists leads_owner_delete on leads;
drop policy if exists leads_super_delete on leads;
-- (leads_owner_insert from 0038 stays; leads_owner_update from 0038 stays: owner may update unless closed)
create policy leads_super_delete on leads for delete
  using (auth_role() = 'super_admin');

-- ── (c) guard: only a super admin can clear or change dismissed_at (BD can set it, never unset) ──
create or replace function crm_guard_undismiss()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dismissed_at is distinct from old.dismissed_at then
    -- a non-super may only go NULL → a timestamp (dismiss). Any other transition (restore, re-stamp)
    -- is super-only.
    if auth_role() <> 'super_admin' and not (old.dismissed_at is null and new.dismissed_at is not null) then
      raise exception 'Only a super admin can restore or change a dismissed record';
    end if;
    -- stamp who dismissed on a fresh dismiss (defense in depth vs a spoofed dismissed_by)
    if old.dismissed_at is null and new.dismissed_at is not null then
      new.dismissed_by := auth.uid();
    end if;
    if new.dismissed_at is null then
      new.dismissed_by := null;
      new.dismiss_reason := null;
    end if;
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['interviews','assessments'] loop
    execute format('drop trigger if exists trg_%1$s_guard_undismiss on %1$s;', t);
    execute format('create trigger trg_%1$s_guard_undismiss before update on %1$s for each row execute function crm_guard_undismiss();', t);
  end loop;
end $$;
