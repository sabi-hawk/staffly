// npm run seed:test — (1) create demo auth users with fixed UUIDs + password Test@12345,
// (2) run supabase/seed.sql, (3) print a verification table of computed hours (§14.6).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { dbUrl, loadEnv, ROOT } from "./lib/env.mjs";

loadEnv();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "Test@12345";
const USERS = [
  { id: "00000000-0000-0000-0000-000000000001", email: "founder@acme.test", full_name: "Founder Admin", role: "super_admin" },
  { id: "00000000-0000-0000-0000-000000000002", email: "hr@acme.test",       full_name: "Hira HR",       role: "admin" },
  { id: "00000000-0000-0000-0000-000000000011", email: "ali@acme.test",      full_name: "Ali Dev",       role: "employee" },
  { id: "00000000-0000-0000-0000-000000000012", email: "sara@acme.test",     full_name: "Sara Dev",      role: "employee" },
  { id: "00000000-0000-0000-0000-000000000013", email: "bilal@acme.test",    full_name: "Bilal BD",      role: "employee" },
  { id: "00000000-0000-0000-0000-000000000014", email: "zara@acme.test",     full_name: "Zara BD",       role: "employee" },
  { id: "00000000-0000-0000-0000-000000000015", email: "omar@acme.test",     full_name: "Omar Ops",      role: "employee" },
];

async function findUserByEmail(email) {
  // paginate admin.listUsers
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(u) {
  const existing = await findUserByEmail(u.email);
  if (existing) {
    if (existing.id !== u.id) {
      // Recreate with the fixed UUID so profiles FKs resolve.
      await admin.auth.admin.deleteUser(existing.id);
    } else {
      // keep, but make sure password + metadata are set
      await admin.auth.admin.updateUserById(u.id, {
        password: PASSWORD,
        user_metadata: { full_name: u.full_name, role: u.role },
        email_confirm: true,
      });
      return "updated";
    }
  }
  const { data, error } = await admin.auth.admin.createUser({
    id: u.id,
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
  if (data.user.id !== u.id)
    throw new Error(`UUID mismatch for ${u.email}: wanted ${u.id} got ${data.user.id}`);
  return "created";
}

async function main() {
  console.log("== 1. Creating demo auth users (password " + PASSWORD + ") ==");
  for (const u of USERS) {
    const r = await ensureUser(u);
    console.log(`   ${r.padEnd(8)} ${u.email.padEnd(20)} ${u.role}`);
  }

  console.log("== 2. Running supabase/seed.sql ==");
  const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = fs.readFileSync(path.join(ROOT, "supabase", "seed.sql"), "utf8");
  await client.query(sql);
  console.log("   seed.sql applied.");

  console.log("== 3. Verification — Ali's attendance (trigger-computed) ==");
  const { rows } = await client.query(
    `select work_date, total_hours, deficit_hours, extra_hours,
            (check_out_time is null) as open
     from attendance
     where employee_id = '00000000-0000-0000-0000-000000000011'
     order by work_date`
  );
  console.log("   date         total  deficit  extra   note");
  const labels = ["normal 9h", "overtime 11h", "deficit 7.5h", "MISSED CHECKOUT", "normal 9h"];
  rows.forEach((r, i) => {
    console.log(
      `   ${String(r.work_date).slice(0, 10)}  ` +
        `${String(r.total_hours ?? "—").padStart(5)}  ` +
        `${String(r.deficit_hours).padStart(6)}  ` +
        `${String(r.extra_hours).padStart(5)}   ${r.open ? "← " + labels[i] : labels[i]}`
    );
  });

  // quick assertions for eyeballing
  const byNote = {};
  rows.forEach((r) => (byNote[String(r.work_date).slice(0, 10)] = r));
  const ok =
    Number(rows[0].deficit_hours) === 0 &&
    Number(rows[1].extra_hours) === 2 &&
    Number(rows[2].deficit_hours) === 1.5 &&
    rows[3].open === true;
  console.log(`\n   canonical dataset correct: ${ok ? "YES ✅" : "NO ❌"}`);

  await client.end();
  console.log("\nDone. Demo logins (password " + PASSWORD + "):");
  console.log("  Super Admin: founder@acme.test | Admin: hr@acme.test | Employee: ali@acme.test");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
