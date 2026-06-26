// §14.3 DB / RLS tests against the cloud Supabase project.
// Signs in as real users (anon key + JWT) so RLS is actually enforced.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { loadEnv, dbUrl } from "./lib/env.mjs";

loadEnv();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "Test@12345";

const ALI = "00000000-0000-0000-0000-000000000011";
const SARA = "00000000-0000-0000-0000-000000000012";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function asUser(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function main() {
  console.log("§14.3 DB / RLS tests\n");

  // --- 1. Trigger math via service-role read (ground truth) ---
  const pgc = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
  await pgc.connect();
  const att = (await pgc.query(
    `select work_date, deficit_hours, extra_hours from attendance
     where employee_id=$1 order by work_date`, [ALI])).rows;
  check("compute trigger: Ali Day1 deficit 0", Number(att[0].deficit_hours) === 0);
  check("compute trigger: Ali Day2 extra 2", Number(att[1].extra_hours) === 2);
  check("compute trigger: Ali Day3 deficit 1.5", Number(att[2].deficit_hours) === 1.5);

  // --- 2. Ali (employee) sees only own attendance ---
  const ali = await asUser("ali@acme.test");
  const aliAtt = await ali.from("attendance").select("employee_id");
  const onlyAli = !aliAtt.error && aliAtt.data.length > 0 && aliAtt.data.every((r) => r.employee_id === ALI);
  check("employee Ali: attendance select returns only own rows (RLS)", onlyAli,
    `${aliAtt.data?.length ?? 0} rows`);

  // --- 3. Employee cannot read salary_structures ---
  const aliSal = await ali.from("salary_structures").select("*");
  check("employee Ali: salary_structures → 0 rows / denied",
    (aliSal.data?.length ?? 0) === 0, aliSal.error ? aliSal.error.message : `${aliSal.data?.length} rows`);

  // --- 4. Admin (Hira) cannot read salary_structures (admin EXCLUDED from payroll) ---
  const hira = await asUser("hr@acme.test");
  const hiraSal = await hira.from("salary_structures").select("*");
  check("admin Hira: salary_structures → 0 rows (admin excluded from payroll)",
    (hiraSal.data?.length ?? 0) === 0, hiraSal.error ? hiraSal.error.message : `${hiraSal.data?.length} rows`);
  const hiraPay = await hira.from("payroll_runs").select("*");
  check("admin Hira: payroll_runs → 0 rows", (hiraPay.data?.length ?? 0) === 0);

  // --- 5. Super admin (Founder) sees all salary rows ---
  const founder = await asUser("founder@acme.test");
  const fSal = await founder.from("salary_structures").select("*");
  check("super_admin Founder: salary_structures → all rows (5 seeded)",
    (fSal.data?.length ?? 0) === 5, `${fSal.data?.length ?? 0} rows`);

  // --- 6. Admin CAN read all attendance (not payroll) ---
  const hiraAtt = await hira.from("attendance").select("employee_id");
  check("admin Hira: attendance → reads all employees", (hiraAtt.data?.length ?? 0) >= 5,
    `${hiraAtt.data?.length ?? 0} rows`);

  // --- 7. Employee cannot UPDATE another employee's attendance ---
  // Find one of Sara's-or-anyone's rows via service role, then try to edit as Ali.
  // (Ali can't even see others' rows, so update affects 0 rows → effectively blocked.)
  await pgc.query(
    `insert into attendance (employee_id, work_date, check_in_time, expected_hours)
     values ($1, current_date - 9, (current_date-9)+time '11:00', 9)
     on conflict (employee_id, work_date) do nothing`, [SARA]);
  const saraRow = (await pgc.query(
    `select id from attendance where employee_id=$1 order by work_date limit 1`, [SARA])).rows[0];
  const upd = await ali.from("attendance").update({ edit_reason: "hacked" }).eq("id", saraRow.id).select();
  const blocked = (upd.data?.length ?? 0) === 0; // RLS using-clause hides the row → 0 updated
  check("employee Ali: UPDATE another employee's attendance → blocked by RLS", blocked,
    upd.error ? upd.error.message : `${upd.data?.length ?? 0} rows updated`);

  await pgc.end();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n§14.3 result: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
