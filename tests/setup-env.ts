// Loads .env.local into process.env for integration tests (cloud Supabase).
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(file)) {
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    } else {
      val = val.replace(/^["']|["']$/g, "");
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Apply the DEV_/PROD_ toggle (mirror scripts/lib/env.mjs resolveEnv) so the plain connection vars the
// tests read are filled from the selected set. APP_ENV defaults to development for the test suite.
{
  const appEnv = String(process.env.APP_ENV || "development").toLowerCase() === "production" ? "production" : "development";
  const prefix = appEnv === "production" ? "PROD_" : "DEV_";
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL"]) {
    const picked = process.env[prefix + name];
    if (picked) process.env[name] = picked;
  }
  process.env.NEXT_PUBLIC_APP_ENV = appEnv;
}
