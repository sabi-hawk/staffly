// §14.3 DB / RLS tests against the cloud Supabase project.
// Signs in as real users (anon key + JWT) so RLS is actually enforced.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { loadEnv, dbUrl } from "./lib/env.mjs";

loadEnv();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// canonical employee = Muzammal Faiz; second employee = Shaiza Maheen
const EMP = "00000000-0000-0000-0000-000000000026";
const EMP_EMAIL = "muzammilfaiz.dev@gmail.com";
const EMP_PW = "Softonoma@123";
const EMP2 = "00000000-0000-0000-0000-000000000021";
const ADMIN_PW = "Test@12345";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function asUser(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function main() {
  console.log("§14.3 DB / RLS tests\n");

  const pgc = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await pgc.connect();
  const att = (await pgc.query(
    `select work_date, deficit_hours, extra_hours from attendance
     where employee_id=$1 and work_date between current_date - 7 and current_date - 3
     order by work_date`, [EMP])).rows;
  check("compute trigger: canonical Day1 deficit 0", Number(att[0].deficit_hours) === 0);
  check("compute trigger: canonical Day2 extra 2", Number(att[1].extra_hours) === 2);
  check("compute trigger: canonical Day3 deficit 1.5", Number(att[2].deficit_hours) === 1.5);

  const emp = await asUser(EMP_EMAIL, EMP_PW);
  const empAtt = await emp.from("attendance").select("employee_id");
  const onlyOwn = !empAtt.error && empAtt.data.length > 0 && empAtt.data.every((r) => r.employee_id === EMP);
  check("employee: attendance select returns only own rows (RLS)", onlyOwn, `${empAtt.data?.length ?? 0} rows`);

  const empSal = await emp.from("salary_structures").select("*");
  check("employee: salary_structures → 0 rows / denied", (empSal.data?.length ?? 0) === 0);

  const empComp = await emp.from("compensation_components").select("*");
  check("employee: compensation_components → 0 rows", (empComp.data?.length ?? 0) === 0);

  const empAudit = await emp.from("audit_log").select("*");
  check("employee: audit_log → 0 rows (super-admin only)", (empAudit.data?.length ?? 0) === 0);

  const hira = await asUser("hr@acme.test", ADMIN_PW);
  const hiraSal = await hira.from("salary_structures").select("*");
  check("admin: salary_structures → 0 rows (admin excluded from payroll)", (hiraSal.data?.length ?? 0) === 0);
  const hiraPay = await hira.from("payroll_runs").select("*");
  check("admin: payroll_runs → 0 rows", (hiraPay.data?.length ?? 0) === 0);
  const hiraAudit = await hira.from("audit_log").select("*");
  check("admin: audit_log → 0 rows (super-admin only)", (hiraAudit.data?.length ?? 0) === 0);

  const founder = await asUser("founder@acme.test", ADMIN_PW);
  const fSal = await founder.from("salary_structures").select("*");
  check("super_admin: salary_structures → all (7 seeded)", (fSal.data?.length ?? 0) === 7, `${fSal.data?.length ?? 0} rows`);
  const fAudit = await founder.from("audit_log").select("id").limit(1);
  check("super_admin: audit_log → readable", !fAudit.error);

  const hiraAtt = await hira.from("attendance").select("employee_id").limit(50);
  check("admin: attendance → reads all employees", (hiraAtt.data?.length ?? 0) >= 5, `${hiraAtt.data?.length ?? 0} rows`);

  // employee cannot update another employee's attendance
  await pgc.query(
    `insert into attendance (employee_id, work_date, check_in_time, expected_hours)
     values ($1, current_date - 9, (current_date-9)+time '11:00', 9)
     on conflict (employee_id, work_date) do nothing`, [EMP2]);
  const otherRow = (await pgc.query(
    `select id from attendance where employee_id=$1 order by work_date limit 1`, [EMP2])).rows[0];
  const upd = await emp.from("attendance").update({ edit_reason: "hacked" }).eq("id", otherRow.id).select();
  check("employee: UPDATE another employee's attendance → blocked by RLS", (upd.data?.length ?? 0) === 0);

  await pgc.end();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n§14.3 result: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
