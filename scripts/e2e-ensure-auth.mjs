// npm run e2e:auth — make browser/E2E login deterministic WITHOUT reseeding.
//
// Why this exists: the browser-verify loop kept getting blocked because a demo account's password had
// drifted from the hard-coded quick-login creds (app/login/page.tsx). Re-running the full seed fixes
// that but WIPES the owner's live dev data — unacceptable. This script only resets the passwords of the
// known demo accounts (via the service-role admin API) and confirms their email — it never touches
// profiles, CRM, attendance, or any business data. Idempotent; safe to run before every E2E pass.
//
// Refuses to run against production (auth is real there). Reads env via the shared loader (never .env.local directly).
import { loadEnv } from "./lib/env.mjs";
import { createClient } from "@supabase/supabase-js";

loadEnv();
if (process.env.NEXT_PUBLIC_APP_ENV === "production" && !process.argv.includes("--force-prod")) {
  console.error("✋ Refusing to reset demo passwords on PRODUCTION. Run against the dev DB.");
  process.exit(1);
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) { console.error("Missing SUPABASE URL / service-role key in env."); process.exit(1); }
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// The exact accounts the login page's quick-demo buttons + the E2E specs use. Keep in lockstep with
// app/login/page.tsx DEMOS and scripts/seed.mjs.
const DEMOS = [
  { email: "super.admin@softonoma.com",     password: "Softonoma@SaDM7k29" },
  { email: "admin@softonoma.com",           password: "Softonoma@HrAd4n63" },
  { email: "fatimasul89@gmail.com",         password: "Softonoma@3310" }, // fatima.sultan (BD Lead)
  { email: "029755shaizamaheen@gmail.com",  password: "Softonoma@1042" }, // shaiza.maheen (BD)
  { email: "muzammilfaiz.dev@gmail.com",    password: "Softonoma@6193" }, // muzammil.faiz (Engineer)
];

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

let ok = 0, missing = 0;
for (const d of DEMOS) {
  const u = await findUserByEmail(d.email);
  if (!u) { console.warn(`⚠️  ${d.email} — no auth user (run npm run seed:test to create it)`); missing++; continue; }
  const { error } = await admin.auth.admin.updateUserById(u.id, { password: d.password, email_confirm: true });
  if (error) { console.error(`❌ ${d.email} — ${error.message}`); continue; }
  // Verify the credential actually works via a real sign-in (anon flow, like the login page).
  const anon = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: signErr } = await anon.auth.signInWithPassword({ email: d.email, password: d.password });
  console.log(signErr ? `❌ ${d.email} — sign-in failed after reset: ${signErr.message}` : `✅ ${d.email}`);
  if (!signErr) ok++;
}
console.log(`\nDemo auth ready: ${ok}/${DEMOS.length} accounts` + (missing ? ` (${missing} missing — seed them first)` : ""));
process.exit(ok === DEMOS.length ? 0 : 1);
