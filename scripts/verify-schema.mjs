// Verifies migrations landed: tables, RLS enabled, functions, triggers.
import pg from "pg";
import { dbUrl } from "./lib/env.mjs";

const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
await client.connect();

const tables = (await client.query(`
  select tablename, rowsecurity from pg_tables
  where schemaname='public' order by tablename`)).rows;

const expected = ["alerts_log","announcements","attendance","audit_log","company_settings",
  "documents","holidays","leave_balances","leave_requests","payroll_runs","profiles",
  "salary_structures","schema_migrations","shifts"];

console.log("=== Tables & RLS ===");
const present = tables.map(t => t.tablename);
for (const t of expected) {
  const row = tables.find(x => x.tablename === t);
  const rls = t === "schema_migrations" ? "n/a" : (row?.rowsecurity ? "RLS ON" : "RLS OFF");
  console.log(`  ${row ? "✓" : "✗"} ${t.padEnd(20)} ${rls}`);
}

const fns = (await client.query(`
  select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and proname in
  ('set_updated_at','handle_new_user','compute_attendance_hours','working_days','auth_role')
  order by proname`)).rows.map(r => r.proname);
console.log("=== Functions ===");
for (const f of ["auth_role","compute_attendance_hours","handle_new_user","set_updated_at","working_days"])
  console.log(`  ${fns.includes(f) ? "✓" : "✗"} ${f}`);

const trigs = (await client.query(`
  select tgname from pg_trigger where not tgisinternal order by tgname`)).rows.map(r => r.tgname);
console.log("=== Triggers (" + trigs.length + ") ===");
console.log("  " + trigs.join(", "));

const enums = (await client.query(`
  select typname from pg_type where typtype='e' and typnamespace='public'::regnamespace order by typname`
)).rows.map(r => r.typname);
console.log("=== Enums ===\n  " + enums.join(", "));

const policies = (await client.query(`select count(*)::int c from pg_policies where schemaname='public'`)).rows[0].c;
console.log("=== RLS policies: " + policies + " ===");

await client.end();
