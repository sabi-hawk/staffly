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

  // (name, stack, owner-BD) — a couple owned, one unassigned.
  const rows = [
    { name: "Sabahat Atique", stack: "Full Stack", ownerName: "Shaiza Maheen", email: "demo.sabahat@example.com", mobile: "0300-0000001" },
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
  console.log("CRM demo seed done ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
