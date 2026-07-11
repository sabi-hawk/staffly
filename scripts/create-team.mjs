// npm run create:team — create (or update) the REAL Softonoma team on the TARGET database (respects
// APP_ENV). Creates each person's login + profile + shift + role flags and syncs their RBAC app_role.
// Loads NO operational/dummy data (no attendance, leave, CRM, payroll, salary, or PII beyond the profile
// fields already in seed.sql). Idempotent — safe to re-run. Use to bootstrap the team on a fresh prod DB.
//
//   npm run create:team          (creates founders + employees)
//   npm run create:team -- --no-founders   (skip the two super-admin founders)
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { dbUrl, loadEnv } from "./lib/env.mjs";

loadEnv();
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
const env = process.env.NEXT_PUBLIC_APP_ENV || "development";
const host = (() => { try { return new URL(SUPA_URL).host; } catch { return SUPA_URL; } })();
const supa = createClient(SUPA_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const pw = (c) => `Softonoma@${c}`;
// The real team (same identities as supabase/seed.sql). Passwords follow Softonoma@<code>; founders keep
// their seed passwords. Flags: is_developer = assignable as interview/assessment/deal dev; is_bd_lead =
// senior BD (sees all BD work). shift = daily working window (Mon–Fri).
const FOUNDERS = [
  { id: "00000000-0000-0000-0000-000000000010", email: "ali.softonoma@gmail.com", username: "ali.ahmad", full_name: "Ali Ahmad", role: "super_admin", employee_code: "8801", gender: "male", employment_type: "onsite", position: "Co-Founder / Engineer", department: "Engineering", password: "Softonoma@AliK7mQ2", is_developer: true },
  { id: "00000000-0000-0000-0000-000000000011", email: "miansabby516@gmail.com", username: "sabahat.atique", full_name: "Sabahat Atique", role: "super_admin", employee_code: "8802", gender: "male", employment_type: "onsite", position: "Founder / Engineer", department: "Engineering", password: "Softonoma@SabX4nP9", is_developer: true },
];
const EMPLOYEES = [
  { id: "00000000-0000-0000-0000-000000000021", email: "029755shaizamaheen@gmail.com", username: "shaiza.maheen", email_secondary: "shaiza.softonoma@gmail.com", full_name: "Shaiza Maheen", role: "employee", employee_code: "1042", gender: "female", employment_type: "remote", position: "Business Developer", department: "Business Development", phone: "03084761857", joining_date: "2025-12-15", shift: ["10:00", "19:00", 90] },
  { id: "00000000-0000-0000-0000-000000000022", email: "ahmad.roshi5@gmail.com", username: "ahmad.roshan", email_secondary: "softonomaahmad@gmail.com", full_name: "Ahmad Roshan", role: "employee", employee_code: "2087", gender: "male", employment_type: "onsite", position: "Sr. Business Executive", department: "Business Development", phone: "03227707911", joining_date: "2026-04-27", shift: ["10:00", "19:00", 90] },
  { id: "00000000-0000-0000-0000-000000000023", email: "fatimasul89@gmail.com", username: "fatima.sultan", email_secondary: "fatima.softonoma21@gmail.com", full_name: "Fatima Sultan", role: "employee", employee_code: "3310", gender: "female", employment_type: "onsite", position: "Jr. Business Executive", department: "Business Development", phone: "03298041475", joining_date: "2026-05-05", is_bd_lead: true, shift: ["10:00", "19:00", 60] },
  { id: "00000000-0000-0000-0000-000000000024", email: "areebazaidi027@gmail.com", username: "areeba.zaidi", email_secondary: "areebasoftonoma@gmail.com", full_name: "Areeba Zaidi", role: "employee", employee_code: "4765", gender: "female", employment_type: "onsite", position: "Internee Business Developer", department: "Business Development", phone: "03425807691", joining_date: "2026-05-21", shift: ["11:00", "16:00", 60] },
  { id: "00000000-0000-0000-0000-000000000025", email: "muhammad.aizaz0900@gmail.com", username: "aizaz.ansab", full_name: "Muhammad Aizaz Ansab", role: "employee", employee_code: "5028", gender: "male", employment_type: "onsite", position: "Software Engineer", department: "Engineering", phone: "03090464711", joining_date: "2025-12-08", is_developer: true, shift: ["10:00", "19:00", 90] },
  { id: "00000000-0000-0000-0000-000000000026", email: "muzammilfaiz.dev@gmail.com", username: "muzammil.faiz", full_name: "Muzammal Faiz", role: "employee", employee_code: "6193", gender: "male", employment_type: "onsite", position: "Sr. Software Engineer", department: "Engineering", phone: "03304014980", joining_date: "2026-02-24", is_developer: true, shift: ["10:00", "19:00", 90] },
  { id: "00000000-0000-0000-0000-000000000027", email: "hamzailyas311@gmail.com", username: "hamza.ilyas", full_name: "Muhammad Hamza Ilyas", role: "employee", employee_code: "7451", gender: "male", employment_type: "onsite", position: "UI/UX Designer", department: "Design", phone: "03210191191", joining_date: "2026-02-02", shift: ["10:00", "18:00", 60] },
].map((e) => ({ ...e, password: pw(e.employee_code) }));

const team = [...(process.argv.includes("--no-founders") ? [] : FOUNDERS), ...EMPLOYEES];

function appRoleKey(p) {
  if (p.role === "super_admin") return "super_admin";
  if (p.role === "admin") return "admin";
  if (p.is_bd_lead) return "bd_lead";
  if (p.department === "Business Development") return "bd";
  return "employee";
}

async function ensureAuthUser(p) {
  const byId = await supa.auth.admin.getUserById(p.id);
  const meta = { full_name: p.full_name, role: p.role };
  if (byId.data?.user) {
    await supa.auth.admin.updateUserById(p.id, { email: p.email, password: p.password, email_confirm: true, user_metadata: meta });
    return "updated";
  }
  // free the email if a different account holds it, then create with the fixed id
  for (let page = 1; page <= 20; page++) {
    const { data } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    const other = data.users.find((u) => u.email === p.email && u.id !== p.id);
    if (other) { await supa.auth.admin.deleteUser(other.id); break; }
    if (data.users.length < 200) break;
  }
  const { error } = await supa.auth.admin.createUser({ id: p.id, email: p.email, password: p.password, email_confirm: true, user_metadata: meta });
  if (error) throw new Error(`createUser ${p.email}: ${error.message}`);
  return "created";
}

async function main() {
  console.log(`Target: ${env.toUpperCase()} DB  (${host})`);
  const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const p of team) {
    const action = await ensureAuthUser(p);
    await client.query(
      `insert into profiles (id, full_name, email, username, email_secondary, role, employee_code, gender,
         employment_type, position, department, phone, joining_date, is_developer, is_bd_lead, status)
       values ($1,$2,$3,$4,$5,$6::user_role,$7,$8,$9::employment_type,$10,$11,$12,$13,$14,$15,'active')
       on conflict (id) do update set full_name=excluded.full_name, email=excluded.email,
         username=excluded.username, email_secondary=excluded.email_secondary, role=excluded.role,
         employee_code=excluded.employee_code, gender=excluded.gender, employment_type=excluded.employment_type,
         position=excluded.position, department=excluded.department, phone=excluded.phone,
         joining_date=excluded.joining_date, is_developer=excluded.is_developer, is_bd_lead=excluded.is_bd_lead,
         status='active'`,
      [p.id, p.full_name, p.email, p.username, p.email_secondary ?? null, p.role, p.employee_code, p.gender,
       p.employment_type, p.position, p.department, p.phone ?? null, p.joining_date ?? null, !!p.is_developer, !!p.is_bd_lead]
    );
    await client.query(`update profiles set app_role_id = (select id from app_roles where key = $2) where id = $1`, [p.id, appRoleKey(p)]);
    // mirror the password into employee_credentials so a super-admin can view/copy it on the profile
    await client.query(
      `insert into employee_credentials (employee_id, portal_password) values ($1, $2)
       on conflict (employee_id) do update set portal_password = excluded.portal_password`,
      [p.id, p.password]
    );
    if (p.shift) {
      await client.query(`delete from shifts where employee_id = $1`, [p.id]);
      await client.query(
        `insert into shifts (employee_id, start_time, end_time, days_of_week, checkin_buffer_minutes)
         values ($1, $2, $3, '{1,2,3,4,5}', $4)`,
        [p.id, p.shift[0], p.shift[1], p.shift[2]]
      );
    }
    console.log(`   ${action.padEnd(8)} ${p.email.padEnd(34)} ${appRoleKey(p)}`);
  }

  await client.end();
  console.log(`\nDone — ${team.length} team members on the ${env.toUpperCase()} DB. Logins:`);
  for (const p of team) console.log(`  ${p.username.padEnd(16)} ${p.email.padEnd(34)} ${p.password}`);
  console.log("\nAsk each person to change their password after first login.");
}

main().catch((e) => { console.error(e); process.exit(1); });
