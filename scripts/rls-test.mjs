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
const EMP_PW = "Softonoma@6193";
const EMP2 = "00000000-0000-0000-0000-000000000021";
const SUPER_EMAIL = "super.admin@softonoma.com";
const SUPER_PW = "Softonoma@SaDM7k29";
const ADMIN_EMAIL = "admin@softonoma.com";
const ADMIN_PW = "Softonoma@HrAd4n63";
// BD users for dev-doc ownership tests: Shaiza (…0021) owns demo profiles; Areeba (…0024) does not.
const SHAIZA_EMAIL = "029755shaizamaheen@gmail.com";
const SHAIZA_PW = "Softonoma@1042";
const AREEBA_EMAIL = "areebazaidi027@gmail.com";
const AREEBA_PW = "Softonoma@4765";
const AREEBA_ID = "00000000-0000-0000-0000-000000000024";

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

  const hira = await asUser(ADMIN_EMAIL, ADMIN_PW);
  const hiraSal = await hira.from("salary_structures").select("*");
  check("admin: salary_structures → 0 rows (admin excluded from payroll)", (hiraSal.data?.length ?? 0) === 0);
  const hiraPay = await hira.from("payroll_runs").select("*");
  check("admin: payroll_runs → 0 rows", (hiraPay.data?.length ?? 0) === 0);
  // audit_log is now SCOPED (FRD-06): admin/BD-Lead see non-financial entries; financial stays super-admin-only.
  const hiraAuditFin = await hira.from("audit_log").select("*").eq("entity", "salary_structures");
  check("admin: audit_log financial (salary) → 0 rows (still hidden)", (hiraAuditFin.data?.length ?? 0) === 0);
  const hiraAuditOps = await hira.from("audit_log").select("id").eq("entity", "profiles").limit(1);
  check("admin: audit_log non-financial (profiles) → readable (scoped, no error)", !hiraAuditOps.error);

  // an admin must NOT be able to self-escalate their role (guard_profile_privileged_cols, 0019)
  const escalate = await hira.from("profiles").update({ role: "super_admin" }).eq("email", ADMIN_EMAIL).select();
  const stillAdmin = (await pgc.query("select role from profiles where email=$1", [ADMIN_EMAIL])).rows[0]?.role;
  check("admin: cannot self-escalate role → super_admin (blocked)", !!escalate.error || stillAdmin === "admin");

  const founder = await asUser(SUPER_EMAIL, SUPER_PW);
  const fSal = await founder.from("salary_structures").select("*");
  check("super_admin: salary_structures → all (8 incl. test acct)", (fSal.data?.length ?? 0) === 8, `${fSal.data?.length ?? 0} rows`);
  const fAudit = await founder.from("audit_log").select("id").limit(1);
  check("super_admin: audit_log → readable", !fAudit.error);

  const hiraAtt = await hira.from("attendance").select("employee_id").limit(50);
  check("admin: attendance → reads all employees", (hiraAtt.data?.length ?? 0) >= 5, `${hiraAtt.data?.length ?? 0} rows`);

  // ── CRM RLS (leads scoped to BD/owner; deals admin-only). Muzammal = Engineering, non-BD.
  const empLeads = await emp.from("leads").select("id");
  check("employee (non-BD): leads → 0 rows (CRM hidden)", (empLeads.data?.length ?? 0) === 0);
  const empDeals = await emp.from("deals").select("id");
  check("employee (non-BD): deals → 0 rows (admin-only)", (empDeals.data?.length ?? 0) === 0);
  const hiraLeads = await hira.from("leads").select("id");
  // admin satisfies auth_is_bd_lead() → sees ALL leads (asserts scope, not just liveness)
  check("admin: leads → readable, sees all (auth_is_bd_lead)", !hiraLeads.error && (hiraLeads.data?.length ?? 0) >= 1, `${hiraLeads.data?.length ?? 0} rows`);
  const hiraDeals = await hira.from("deals").select("id");
  check("admin/HR: deals → 0 rows (super-admin only now, 0030)", (hiraDeals.data?.length ?? 0) === 0, `${hiraDeals.data?.length ?? 0} rows`);
  const hiraAccts = await hira.from("receiving_accounts").select("id");
  check("admin/HR: receiving_accounts → 0 rows (super-admin only)", (hiraAccts.data?.length ?? 0) === 0);
  const founderDeals = await founder.from("deals").select("id");
  check("super_admin: deals → readable", !founderDeals.error && (founderDeals.data?.length ?? 0) >= 1);

  // ── crm_alerts (FRD-07): admin/super read-only; everyone else blocked; trigger fires on close.
  const empAlerts = await emp.from("crm_alerts").select("id");
  check("employee (non-BD): crm_alerts → 0 rows (admin-only)", (empAlerts.data?.length ?? 0) === 0);
  const hiraAlerts = await hira.from("crm_alerts").select("id");
  check("admin: crm_alerts → readable (no error)", !hiraAlerts.error);
  // trigger smoke: create a lead for a BD, flip it to closed, expect exactly one alert; then clean up.
  const tLead = (await pgc.query(
    `insert into leads (company, owner_bd_id, status) values ('__RLS_TEST_CO__', $1, 'in_progress') returning id`,
    [EMP2])).rows[0].id;
  await pgc.query(`update leads set status='closed' where id=$1`, [tLead]);
  const alertN = (await pgc.query(`select count(*)::int n from crm_alerts where lead_id=$1`, [tLead])).rows[0].n;
  check("trigger: closing a lead inserts one crm_alert", alertN === 1, `${alertN} alert(s)`);
  await pgc.query(`delete from leads where id=$1`, [tLead]); // cascade removes the alert

  // ── dev-profile documents (0022/0023): owner BD writes/soft-deletes own; non-owner BD + non-BD
  //     blocked; admin soft/hard-deletes + sees history; soft-deleted hidden from the owner's SELECT.
  const shaizaProfile = (await pgc.query(
    `select id from dev_profiles where owner_bd_id=$1 limit 1`, [EMP2])).rows[0]?.id;
  if (shaizaProfile) {
    // non-BD employee cannot insert / hard-delete
    const seedDoc = (await pgc.query(
      `insert into dev_profile_documents (dev_profile_id, doc_type, file_path)
       values ($1, 'resume', '__rls__/t.pdf') returning id`, [shaizaProfile])).rows[0].id;
    const empDocIns = await emp.from("dev_profile_documents")
      .insert({ dev_profile_id: shaizaProfile, doc_type: "resume", file_path: "__rls__/x.pdf" }).select();
    check("employee (non-BD): insert dev-profile doc → blocked", !!empDocIns.error || (empDocIns.data?.length ?? 0) === 0);
    const empDocDel = await emp.from("dev_profile_documents").delete().eq("id", seedDoc).select();
    check("employee (non-BD): hard-delete dev-profile doc → blocked", (empDocDel.data?.length ?? 0) === 0);

    // owner BD (Shaiza) CAN insert + soft-delete a doc on her own profile
    const shaiza = await asUser(SHAIZA_EMAIL, SHAIZA_PW);
    const bdIns = await shaiza.from("dev_profile_documents")
      .insert({ dev_profile_id: shaizaProfile, doc_type: "resume", file_path: "__rls__/bd.pdf" }).select("id");
    check("BD owner: insert doc on own profile → allowed", (bdIns.data?.length ?? 0) === 1);
    const ownDocId = bdIns.data?.[0]?.id ?? seedDoc;
    // soft-delete via the security-definer RPC (0024) — a plain owner UPDATE is rejected once the row
    // flips invisible to the owner (SELECT policy 0023). Verify the write landed via service-role pg.
    const bdSoft = await shaiza.rpc("crm_soft_delete_document", { p_doc_id: ownDocId });
    check("BD owner: soft-delete own doc via RPC → allowed", !bdSoft.error);
    const softAt = (await pgc.query(`select deleted_at from dev_profile_documents where id=$1`, [ownDocId])).rows[0]?.deleted_at;
    check("BD owner: soft-delete own doc → applied", !!softAt);
    // soft-deleted row is hidden from the owner's SELECT (history is admin-only, 0023)
    const bdSees = await shaiza.from("dev_profile_documents").select("id").eq("id", ownDocId);
    check("BD owner: soft-deleted doc hidden from own SELECT (0023)", (bdSees.data?.length ?? 0) === 0);

    // non-owner BD (Areeba) cannot soft-delete Shaiza's doc — RPC authorizes via can_manage_dev_docs
    const areeba = await asUser(AREEBA_EMAIL, AREEBA_PW);
    const otherSoft = await areeba.rpc("crm_soft_delete_document", { p_doc_id: seedDoc });
    const stillLive = (await pgc.query(`select deleted_at from dev_profile_documents where id=$1`, [seedDoc])).rows[0]?.deleted_at;
    check("BD non-owner: soft-delete another BD's doc → blocked", !!otherSoft.error && !stillLive);

    // admin soft-delete + sees history + hard-delete
    const admSoft = await hira.from("dev_profile_documents")
      .update({ deleted_at: new Date().toISOString() }).eq("id", seedDoc).select("id");
    check("admin: soft-delete dev-profile doc (update) → allowed", (admSoft.data?.length ?? 0) === 1);
    const admSees = await hira.from("dev_profile_documents").select("id").eq("id", seedDoc);
    check("admin: sees soft-deleted doc in history (0023)", (admSees.data?.length ?? 0) === 1);
    const admHard = await hira.from("dev_profile_documents").delete().eq("id", seedDoc).select("id");
    check("admin: hard-delete dev-profile doc → allowed", (admHard.data?.length ?? 0) === 1);

    // cleanup any rows left by the above (best-effort)
    await pgc.query(`delete from dev_profile_documents where file_path like '__rls__/%'`);
  }

  // ── lead_contacts (0025): owner BD reads/writes own lead's contacts; non-owner BD + non-BD blocked.
  const shaizaLead = (await pgc.query(`select id from leads where owner_bd_id=$1 limit 1`, [EMP2])).rows[0]?.id;
  if (shaizaLead) {
    const empC = await emp.from("lead_contacts").insert({ lead_id: shaizaLead, contact_type: "hr", email: "x@y.com" }).select();
    check("employee (non-BD): insert lead_contact → blocked", !!empC.error || (empC.data?.length ?? 0) === 0);
    const shaiza = await asUser(SHAIZA_EMAIL, SHAIZA_PW);
    const ins = await shaiza.from("lead_contacts").insert({ lead_id: shaizaLead, contact_type: "hr", email: "hr@acme.com" }).select("id");
    check("BD owner: insert lead_contact on own lead → allowed", (ins.data?.length ?? 0) === 1);
    const cid = ins.data?.[0]?.id;
    const sees = await shaiza.from("lead_contacts").select("id").eq("id", cid);
    check("BD owner: reads own lead_contact", (sees.data?.length ?? 0) === 1);
    const areeba = await asUser(AREEBA_EMAIL, AREEBA_PW);
    const aSees = await areeba.from("lead_contacts").select("id").eq("id", cid);
    check("BD non-owner: cannot read another lead's contact", (aSees.data?.length ?? 0) === 0);
    const aUpd = await areeba.from("lead_contacts").update({ email: "hacked@x.com" }).eq("id", cid).select("id");
    check("BD non-owner: cannot update another lead's contact", (aUpd.data?.length ?? 0) === 0);
    if (cid) await pgc.query(`delete from lead_contacts where id=$1`, [cid]);
  }

  // employee cannot update another employee's attendance
  await pgc.query(
    `insert into attendance (employee_id, work_date, check_in_time, expected_hours)
     values ($1, current_date - 9, (current_date-9)+time '11:00', 9)
     on conflict (employee_id, work_date) do nothing`, [EMP2]);
  const otherRow = (await pgc.query(
    `select id from attendance where employee_id=$1 order by work_date limit 1`, [EMP2])).rows[0];
  const upd = await emp.from("attendance").update({ edit_reason: "hacked" }).eq("id", otherRow.id).select();
  check("employee: UPDATE another employee's attendance → blocked by RLS", (upd.data?.length ?? 0) === 0);

  // ── daily task summary (0027/0028): the save_daily_summary RPC (security-definer, auth.uid()) lets
  //    an employee write their own day's summary — same-day free, past-missing = late, past-present = locked.
  const pkt = (offset) => { const d = new Date(Date.now() + 5 * 3600_000); d.setUTCDate(d.getUTCDate() - offset); return d.toISOString().slice(0, 10); };
  const dsToday = pkt(0);
  const dsPast = pkt(10); // outside the canonical day-3..7 pattern used by the compute-trigger checks
  await pgc.query(`delete from attendance where employee_id=$1 and work_date = any($2)`, [EMP, [dsToday, dsPast]]);
  await pgc.query(
    `insert into attendance (employee_id, work_date, check_in_time, expected_hours)
     values ($1,$2, now(), 9), ($1,$3, now() - interval '10 days', 9)`, [EMP, dsToday, dsPast]);

  const sToday = await emp.rpc("save_daily_summary", { p_work_date: dsToday, p_html: "<p>Shipped the summary feature.</p>" });
  check("employee: save today's summary via RPC → allowed, not late", !sToday.error && sToday.data === false, sToday.error?.message ?? "");
  const sEmpty = await emp.rpc("save_daily_summary", { p_work_date: dsToday, p_html: "   " });
  check("employee: empty summary → rejected", !!sEmpty.error);
  const sLate = await emp.rpc("save_daily_summary", { p_work_date: dsPast, p_html: "<p>Forgot to log this.</p>" });
  check("employee: past-missing summary → allowed as LATE", !sLate.error && sLate.data === true, sLate.error?.message ?? "");
  const lateFlag = (await pgc.query(`select summary_late from attendance where employee_id=$1 and work_date=$2`, [EMP, dsPast])).rows[0]?.summary_late;
  check("employee: late add sets summary_late = true", lateFlag === true);
  const sLocked = await emp.rpc("save_daily_summary", { p_work_date: dsPast, p_html: "<p>Trying to edit a locked day.</p>" });
  check("employee: past-present summary → locked (rejected)", !!sLocked.error);
  await pgc.query(`delete from attendance where employee_id=$1 and work_date = any($2)`, [EMP, [dsToday, dsPast]]);

  // ── deal_developers (0029): admin manages; a developer reads only their own assignment rows and can
  //    see the deal NAME via my_deals() (definer) — never the deals table (admin-only) or financials.
  const anyDeal = (await pgc.query(`select id from deals limit 1`)).rows[0]?.id;
  if (anyDeal) {
    await pgc.query(`delete from deal_developers where deal_id=$1 and developer_id=$2`, [anyDeal, EMP]);
    await pgc.query(`insert into deal_developers (deal_id, developer_id, role) values ($1,$2,'developer')`, [anyDeal, EMP]);
    const empDeals = await emp.from("deals").select("id, salary");
    check("employee (dev): cannot read the deals table (admin-only)", (empDeals.data?.length ?? 0) === 0);
    const empAssign = await emp.from("deal_developers").select("deal_id");
    check("employee (dev): reads own deal_developers rows", (empAssign.data?.length ?? 0) >= 1);
    const myD = await emp.rpc("my_deals");
    check("employee (dev): my_deals() returns name (no financials)", !myD.error && (myD.data?.length ?? 0) >= 1 && myD.data[0].salary === undefined);
    // deal_directory() (0032): admin/HR sees name+assignment (no financials); a dev/non-admin gets 0.
    const hiraDir = await hira.rpc("deal_directory");
    check("admin/HR: deal_directory() → name+assignment (no salary col)", !hiraDir.error && (hiraDir.data?.length ?? 0) >= 1 && hiraDir.data[0].salary === undefined && hiraDir.data[0].deal_name !== undefined);
    const empDir = await emp.rpc("deal_directory");
    check("employee (dev): deal_directory() → 0 rows (admin/super only)", (empDir.data?.length ?? 0) === 0);
    const empWrite = await emp.from("deal_developers").insert({ deal_id: anyDeal, developer_id: EMP2, role: "developer" }).select();
    check("employee (dev): cannot assign developers (admin-only)", !!empWrite.error || (empWrite.data?.length ?? 0) === 0);
    await pgc.query(`delete from deal_developers where deal_id=$1 and developer_id=$2`, [anyDeal, EMP]);
  }

  // ── is_deal_developer flag (0031): only admins may set it; a non-admin self-set is blocked by the guard.
  const empFlag = await emp.from("profiles").update({ is_deal_developer: true }).eq("id", EMP).select();
  const flagAfter = (await pgc.query(`select is_deal_developer from profiles where id=$1`, [EMP])).rows[0]?.is_deal_developer;
  check("employee: cannot self-set is_deal_developer (guard trigger)", !!empFlag.error || flagAfter === false);

  // ── crm_calendar (0034): a BD sees every booking (time+stack), full details only for their own
  //    (or admin); other BDs' interviews are masked (no company). Non-BD/non-admin gets 0 rows.
  const calProfile = (await pgc.query(`select id from dev_profiles where owner_bd_id=$1 limit 1`, [EMP2])).rows[0]?.id;
  if (calProfile) {
    const iat = new Date(Date.now() + 2 * 86400000).toISOString();
    const i1 = (await pgc.query(`insert into interviews (owner_bd_id, dev_profile_id, company, job_title, interview_at, status) values ($1,$2,'CalTestCo','X',$3,'scheduled') returning id`, [EMP2, calProfile, iat])).rows[0].id;
    const i2 = (await pgc.query(`insert into interviews (owner_bd_id, dev_profile_id, company, job_title, interview_at, status) values ($1,$2,'CalTestOther','Y',$3,'scheduled') returning id`, [AREEBA_ID, calProfile, iat])).rows[0].id;
    const shaizaC = await asUser(SHAIZA_EMAIL, SHAIZA_PW);
    const cal = await shaizaC.rpc("crm_calendar", { p_from: new Date(Date.now() - 86400000).toISOString(), p_to: new Date(Date.now() + 5 * 86400000).toISOString() });
    const mine = (cal.data ?? []).find((e) => e.company === "CalTestCo");
    const other = (cal.data ?? []).find((e) => e.id === i2);
    check("BD: crm_calendar own interview → expandable + company visible", !!mine && mine.can_expand === true && mine.is_mine === true);
    check("BD: crm_calendar other BD's interview → masked (no company, has stack)", !!other && other.can_expand === false && other.company === null);
    const empCal = await emp.rpc("crm_calendar", { p_from: new Date(Date.now() - 86400000).toISOString(), p_to: new Date(Date.now() + 5 * 86400000).toISOString() });
    check("employee (non-BD): crm_calendar → 0 rows", (empCal.data?.length ?? 0) === 0);
    await pgc.query(`delete from interviews where id = any($1)`, [[i1, i2]]);
  }

  // ── RBAC foundation (0035): backfilled roles, auth_has_perm, guarded assignment, locked catalog.
  const shaizaR = await asUser(SHAIZA_EMAIL, SHAIZA_PW);
  const permBd = await shaizaR.rpc("auth_has_perm", { p_perm: "crm.access" });
  check("RBAC: BD role → auth_has_perm('crm.access') = true", permBd.data === true, permBd.error?.message ?? "");
  const permPay = await shaizaR.rpc("auth_has_perm", { p_perm: "payroll.manage" });
  check("RBAC: BD role → auth_has_perm('payroll.manage') = false", permPay.data === false);
  const founderPay = await founder.rpc("auth_has_perm", { p_perm: "payroll.manage" });
  check("RBAC: super_admin → auth_has_perm('payroll.manage') = true", founderPay.data === true);
  const catalog = await emp.from("permissions").select("key").limit(1);
  check("RBAC: catalog readable by any signed-in user", !catalog.error && (catalog.data?.length ?? 0) === 1);
  const superRoleId = (await pgc.query(`select id from app_roles where key='super_admin'`)).rows[0].id;
  await emp.from("profiles").update({ app_role_id: superRoleId }).eq("id", EMP);
  const empRole = (await pgc.query(`select ar.key from profiles p join app_roles ar on ar.id=p.app_role_id where p.id=$1`, [EMP])).rows[0]?.key;
  check("RBAC: employee cannot self-assign a role (guard trigger)", empRole === "employee", `role=${empRole}`);
  const roleWrite = await shaizaR.from("app_roles").insert({ key: "hax", name: "Hax" }).select();
  check("RBAC: non-super cannot create roles (roles.manage RLS)", !!roleWrite.error || (roleWrite.data?.length ?? 0) === 0);

  await pgc.end();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n§14.3 result: ${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
