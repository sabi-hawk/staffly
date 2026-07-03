// Idempotent demo seed for the CRM Profiles module (dev_profiles + stacks + a secret).
// Uses the service-role client (bypasses RLS; record_audit skips service-role writes).
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

loadEnv();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: stacks } = await admin.from("dev_stacks").select("id, name");
  const stackId = (n) => stacks.find((s) => s.name === n)?.id ?? null;

  const { data: bds } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("department", "Business Development");
  const owner = (name) => bds.find((b) => b.full_name === name)?.id ?? null;

  // (name, stack, owner-BD) — Shaiza owns three (for BD-view testing), one for Areeba, one unassigned.
  const rows = [
    { name: "Sabahat Atique", stack: "Full Stack", ownerName: "Shaiza Maheen", email: "demo.sabahat@example.com", mobile: "0300-0000001" },
    { name: "Bilal Khan", stack: "Backend", ownerName: "Shaiza Maheen", email: "demo.bilal@example.com", mobile: "0300-0000004" },
    { name: "Hina Raza", stack: "Full Stack", ownerName: "Shaiza Maheen", email: "demo.hina@example.com", mobile: "0300-0000005" },
    { name: "Ali Ahmad", stack: "Backend", ownerName: "Areeba Zaidi", email: "demo.ali@example.com", mobile: "0300-0000002", notes: "LinkedIn banned" },
    { name: "Atique Latif", stack: "Data Engineer", ownerName: null, email: "demo.atique@example.com", mobile: "0300-0000003" },
  ];

  for (const r of rows) {
    // upsert by (name, email) — delete existing demo row then insert to stay idempotent
    await admin.from("dev_profiles").delete().eq("email", r.email);
    const { data, error } = await admin
      .from("dev_profiles")
      .insert({
        name: r.name,
        stack_id: stackId(r.stack),
        owner_bd_id: r.ownerName ? owner(r.ownerName) : null,
        email: r.email,
        mobile: r.mobile,
        notes: r.notes ?? null,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(`${r.name}: ${error.message}`);
    // a demo account password (admin-only visibility)
    await admin.from("dev_profile_secrets").upsert({
      dev_profile_id: data.id,
      account_password: "Demo@" + Math.floor(1000 + (r.email.length * 137) % 9000),
    });
    console.log(`seeded dev_profile: ${r.name} (${r.stack}) → ${r.ownerName ?? "Unassigned"}`);
  }

  // Flag a few developers (interview/assessment "given by / completed by" picker source).
  const devNames = ["Muzammal Faiz", "Muhammad Aizaz Ansab", "Super Admin"];
  const { data: allProfiles } = await admin.from("profiles").select("id, full_name");
  const pid = (name) => allProfiles.find((p) => p.full_name === name)?.id ?? null;
  for (const n of devNames) {
    const id = pid(n);
    if (id) await admin.from("profiles").update({ is_developer: true }).eq("id", id);
  }
  console.log("flagged developers:", devNames.join(", "));

  // A demo lead (owned by Shaiza) + one interview + one assessment, for browser/E2E verification.
  const shaiza = bds.find((b) => b.full_name === "Shaiza Maheen")?.id ?? null;
  const { data: sabahat } = await admin.from("dev_profiles").select("id").eq("email", "demo.sabahat@example.com").maybeSingle();
  if (shaiza && sabahat) {
    await admin.from("leads").delete().eq("company", "DemoCorp").eq("owner_bd_id", shaiza);
    const { data: lead } = await admin.from("leads")
      .insert({ company: "DemoCorp", role: "Senior Full Stack", dev_profile_id: sabahat.id, owner_bd_id: shaiza, status: "in_progress" })
      .select("id").single();
    const dev = pid("Muzammal Faiz");
    await admin.from("interviews").insert({
      lead_id: lead.id, dev_profile_id: sabahat.id, owner_bd_id: shaiza, job_title: "Senior Full Stack Engineer",
      company: "DemoCorp", status: "completed", round: "1st", outcome: "selected", given_by: dev, whom_should_give: dev,
    });
    await admin.from("assessments").insert({
      lead_id: lead.id, dev_profile_id: sabahat.id, owner_bd_id: shaiza, job_title: "Take-home", company: "DemoCorp",
      status: "pending", priority: "high", duration: "1h", completed_by: dev,
    });
    console.log("seeded demo lead + interview + assessment (DemoCorp → Shaiza)");

    // Demo deal (admin-only) from the DemoCorp lead.
    await admin.from("receiving_accounts").delete().eq("holder_name", "Demo Holder");
    const { data: acct } = await admin.from("receiving_accounts")
      .insert({ holder_name: "Demo Holder", bank_name: "Demo Bank", account_number: "PK00DEMO0000" }).select("id").single();
    const { data: pm } = await admin.from("payment_methods").select("id").eq("name", "Wise").maybeSingle();
    await admin.from("deals").delete().eq("lead_id", lead.id);
    await admin.from("deals").insert({
      lead_id: lead.id, designation: "Senior Full Stack", dev_profile_id: sabahat.id, working_developer: dev,
      salary: 750000, receiving_account_id: acct?.id ?? null, payment_method_id: pm?.id ?? null, status: "active",
    });
    console.log("seeded demo deal (DemoCorp)");
  }
  console.log("CRM demo seed done ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
