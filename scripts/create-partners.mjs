// npm run create:partners — set up the founder/partner accounts on the TARGET DB (respects APP_ENV).
// Ali & Sabahat move OFF super_admin onto "Partner (Developer)"; Mohiudin Ghazi is created as
// "Partner (BD)". All keep base role 'employee' (so they list in People + are payable via compensation),
// are flagged is_partner, get NO shift and NO salary_structure. Idempotent. super_admin stays the
// dedicated super.admin@ account.
//
//   npm run create:partners
//   npm run create:partners -- --mo-email mohiudin@softonoma.com --mo-password 'Strong#Pass1'
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
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

const PARTNERS = [
  { id: "00000000-0000-0000-0000-000000000010", email: "ali.softonoma@gmail.com", username: "ali.ahmad", full_name: "Ali Ahmad", employee_code: "8801", gender: "male", employment_type: "onsite", position: "Co-Founder / Engineer", department: "Engineering", app_role: "partner_dev", is_developer: true, password: "Softonoma@AliK7mQ2" },
  { id: "00000000-0000-0000-0000-000000000011", email: "miansabby516@gmail.com", username: "sabahat.atique", full_name: "Sabahat Atique", employee_code: "8802", gender: "male", employment_type: "onsite", position: "Founder / Engineer", department: "Engineering", app_role: "partner_dev", is_developer: true, password: "Softonoma@SabX4nP9" },
  { id: "00000000-0000-0000-0000-000000000012", email: arg("--mo-email", "mohiudin.ghazi@softonoma.com"), username: "mohiudin.ghazi", full_name: "Mohiudin Ghazi", employee_code: "8803", gender: "male", employment_type: "onsite", position: "Business Developer", department: "Business Development", app_role: "partner_bd", is_developer: false, password: arg("--mo-password", "Softonoma@Moh8xK4z") },
];

async function ensureAuthUser(p) {
  const byId = await supa.auth.admin.getUserById(p.id);
  const meta = { full_name: p.full_name, role: "employee" };
  if (byId.data?.user) {
    await supa.auth.admin.updateUserById(p.id, { email: p.email, password: p.password, email_confirm: true, user_metadata: meta });
    return "updated";
  }
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

  for (const p of PARTNERS) {
    const action = await ensureAuthUser(p);
    await client.query(
      `insert into profiles (id, full_name, email, username, role, employee_code, gender, employment_type,
         position, department, is_partner, is_developer, is_bd_lead, status)
       values ($1,$2,$3,$4,'employee'::user_role,$5,$6,$7::employment_type,$8,$9,true,$10,false,'active')
       on conflict (id) do update set full_name=excluded.full_name, email=excluded.email,
         username=excluded.username, role='employee'::user_role, employee_code=excluded.employee_code,
         gender=excluded.gender, employment_type=excluded.employment_type, position=excluded.position,
         department=excluded.department, is_partner=true, is_developer=excluded.is_developer,
         is_bd_lead=false, status='active'`,
      [p.id, p.full_name, p.email, p.username, p.employee_code, p.gender, p.employment_type, p.position, p.department, !!p.is_developer]
    );
    await client.query(`update profiles set app_role_id = (select id from app_roles where key = $2) where id = $1`, [p.id, p.app_role]);
    // partners have no attendance obligation and no base salary
    await client.query(`delete from shifts where employee_id = $1`, [p.id]);
    await client.query(`delete from salary_structures where employee_id = $1`, [p.id]);
    console.log(`   ${action.padEnd(8)} ${p.email.padEnd(34)} ${p.app_role}`);
  }

  await client.end();
  console.log(`\nDone — ${PARTNERS.length} partner accounts on the ${env.toUpperCase()} DB. Logins:`);
  for (const p of PARTNERS) console.log(`  ${p.username.padEnd(16)} ${p.email.padEnd(34)} ${p.password}`);
  console.log("\nsuper_admin stays super.admin@softonoma.com. Partners: no check-in/leave; CRM + delete rights.");
}

main().catch((e) => { console.error(e); process.exit(1); });
