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

const ADMIN_PASSWORD = "Test@12345";       // founder + hr admin accounts
const EMP_PASSWORD = "Softonoma@123";      // real employees
const USERS = [
  { id: "00000000-0000-0000-0000-000000000001", email: "founder@acme.test", full_name: "Founder Admin", role: "super_admin", password: ADMIN_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000002", email: "hr@acme.test",       full_name: "Hira HR",       role: "admin",       password: ADMIN_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000021", email: "029755shaizamaheen@gmail.com", full_name: "Shaiza Maheen",        role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000022", email: "ahmad.roshi5@gmail.com",        full_name: "Ahmad Roshan",         role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000023", email: "fatimasul89@gmail.com",         full_name: "Fatima Sultan",        role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000024", email: "areebazaidi027@gmail.com",      full_name: "Areeba",               role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000025", email: "muhammad.aizaz0900@gmail.com",  full_name: "Muhammad Aizaz Ansab", role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000026", email: "muzammilfaiz.dev@gmail.com",    full_name: "Muzammal Faiz",        role: "employee", password: EMP_PASSWORD },
  { id: "00000000-0000-0000-0000-000000000027", email: "hamzailyas311@gmail.com",       full_name: "Muhammad Hamza Ilyas", role: "employee", password: EMP_PASSWORD },
];

// Legacy fake employees from v1 — remove their auth users so they no longer appear.
const STALE_EMAILS = ["ali@acme.test", "sara@acme.test", "bilal@acme.test", "zara@acme.test", "omar@acme.test"];

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
      await admin.auth.admin.updateUserById(u.id, {
        password: u.password,
        user_metadata: { full_name: u.full_name, role: u.role },
        email_confirm: true,
      });
      return "updated";
    }
  }
  const { data, error } = await admin.auth.admin.createUser({
    id: u.id,
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
  if (data.user.id !== u.id)
    throw new Error(`UUID mismatch for ${u.email}: wanted ${u.id} got ${data.user.id}`);
  return "created";
}

async function removeStaleUsers() {
  for (const email of STALE_EMAILS) {
    const existing = await findUserByEmail(email);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
      console.log(`   removed legacy user ${email}`);
    }
  }
}

async function main() {
  console.log("== 0. Removing legacy fake employees ==");
  await removeStaleUsers();

  console.log("== 1. Creating auth users (admins Test@12345 / employees Softonoma@123) ==");
  for (const u of USERS) {
    const r = await ensureUser(u);
    console.log(`   ${r.padEnd(8)} ${u.email.padEnd(34)} ${u.role}`);
  }

  console.log("== 2. Running supabase/seed.sql ==");
  const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = fs.readFileSync(path.join(ROOT, "supabase", "seed.sql"), "utf8");
  await client.query(sql);
  console.log("   seed.sql applied.");

  // counts for pagination/analytics sanity
  const counts = await client.query(
    `select (select count(*) from profiles where role='employee') emp,
            (select count(*) from attendance) att,
            (select count(*) from compensation_components) comp`
  );
  console.log(`== 2b. Counts — employees ${counts.rows[0].emp}, attendance rows ${counts.rows[0].att}, compensation ${counts.rows[0].comp} ==`);

  console.log("== 3. Verification — Muzammal's canonical last 5 working days ==");
  const { rows } = await client.query(
    `select work_date, total_hours, deficit_hours, extra_hours,
            (check_out_time is null) as open
     from attendance
     where employee_id = '00000000-0000-0000-0000-000000000026'
       and work_date >= current_date - 7 and work_date <= current_date - 3
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
  console.log("\nDone. Logins:");
  console.log("  Super Admin: founder@acme.test (Test@12345) | Admin: hr@acme.test (Test@12345)");
  console.log("  Employees:   <their email> (Softonoma@123) — e.g. muzammilfaiz.dev@gmail.com");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
