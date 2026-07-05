-- 0030_deals_super_only.sql — deal details (incl. financials) are SUPER-ADMIN only.
-- Owner rule: HR (the `admin` role) must not see a deal's salary / payment / details — only the deal
-- name + which developer is assigned (surfaced separately, admin-safe). So tighten deals + related from
-- admin+super (0014) to super_admin only. Developers still see their own deal NAME via my_deals()
-- (security-definer) and their own deal_developers rows.

do $$ declare t text; begin
  foreach t in array array['deals','deal_documents','receiving_accounts'] loop
    execute format('drop policy if exists %1$s_admin on %1$s;', t);
    execute format('drop policy if exists %1$s_super on %1$s;', t);
    execute format($f$create policy %1$s_super on %1$s for all
      using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');$f$, t);
  end loop;
end $$;

-- deal_developers: super_admin manages; a developer still reads their OWN assignment rows.
drop policy if exists deal_devs_admin on deal_developers;
drop policy if exists deal_devs_super on deal_developers;
create policy deal_devs_super on deal_developers for all
  using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');
-- (deal_devs_self_read stays as-is: using (developer_id = auth.uid()))

-- payment_methods: still readable by any authenticated user (harmless lookup); writes super-admin only.
drop policy if exists payment_methods_write on payment_methods;
create policy payment_methods_write on payment_methods for all
  using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');
