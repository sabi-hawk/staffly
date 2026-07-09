// npm run create:admins — create (or update) the SUPER-ADMIN + ADMIN accounts on the TARGET database
// (respects APP_ENV, so it works on a fresh PROD project). Unlike seed:test this loads NO dummy data —
// just the two admin logins so you can sign in and add real users from the app. Idempotent.
//
// Defaults create:  super.admin@softonoma.com (super_admin)  +  admin@softonoma.com (admin)
// Override the super admin with flags, e.g.:
//   npm run create:admins -- --super-email you@softonoma.com --super-password 'Strong#Pass1' --super-name 'Your Name'
// Skip the HR admin with --no-admin.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { dbUrl, loadEnv } from "./lib/env.mjs";

loadEnv();
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set APP_ENV + the DEV_/PROD_ vars.");
  process.exit(1);
}
const env = process.env.NEXT_PUBLIC_APP_ENV || "development";
const host = (() => { try { return new URL(SUPA_URL).host; } catch { return SUPA_URL; } })();
const supa = createClient(SUPA_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const accounts = [
  { email: arg("--super-email", "super.admin@softonoma.com"), password: arg("--super-password", "Softonoma@SaDM7k29"), full_name: arg("--super-name", "Super Admin"), role: "super_admin" },
];
if (!process.argv.includes("--no-admin")) {
  accounts.push({ email: arg("--admin-email", "admin@softonoma.com"), password: arg("--admin-password", "Softonoma@HrAd4n63"), full_name: arg("--admin-name", "HR Admin"), role: "admin" });
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Create the auth user (or update its password/metadata if it already exists). Returns the user id. */
async function ensureAuthUser(a) {
  const existing = await findUserByEmail(a.email);
  if (existing) {
    await supa.auth.admin.updateUserById(existing.id, {
      password: a.password,
      email_confirm: true,
      user_metadata: { full_name: a.full_name, role: a.role },
    });
    return { id: existing.id, action: "updated" };
  }
  const { data, error } = await supa.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { full_name: a.full_name, role: a.role },
  });
  if (error) throw new Error(`createUser ${a.email}: ${error.message}`);
  return { id: data.user.id, action: "created" };
}

async function main() {
  console.log(`Target: ${env.toUpperCase()} DB  (${host})`);
  const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const a of accounts) {
    const { id, action } = await ensureAuthUser(a);
    // handle_new_user creates the profile as 'employee'; elevate it + set the matching RBAC app_role.
    const res = await client.query(
      `update profiles
         set role = $2::user_role, full_name = $3, status = 'active',
             app_role_id = (select id from app_roles where key = $4)
       where id = $1`,
      [id, a.role, a.full_name, a.role]
    );
    if (res.rowCount === 0) {
      // profile row didn't exist yet (no trigger) — insert it explicitly
      await client.query(
        `insert into profiles (id, email, full_name, role, status, app_role_id)
         values ($1, $5, $3, $2::user_role, 'active', (select id from app_roles where key = $4))
         on conflict (id) do update set role = excluded.role, full_name = excluded.full_name,
             status = 'active', app_role_id = excluded.app_role_id`,
        [id, a.role, a.full_name, a.role, a.email]
      );
    }
    console.log(`   ${action.padEnd(8)} ${a.email.padEnd(34)} ${a.role}`);
  }

  await client.end();
  console.log("\nDone. Sign in with:");
  for (const a of accounts) console.log(`  ${a.role.padEnd(12)} ${a.email}  /  ${a.password}`);
  console.log("\nChange these passwords after first login, then add real users from the app (People → Users).");
}

main().catch((e) => { console.error(e); process.exit(1); });
