// Minimal .env.local loader for Node scripts (no dependency on dotenv at runtime).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv() {
  const file = path.join(root, ".env.local");
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      // strip inline comments only when value isn't quoted
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hash = val.indexOf(" #");
        if (hash !== -1) val = val.slice(0, hash).trim();
      } else {
        val = val.replace(/^["']|["']$/g, "");
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
  resolveEnv();
  return process.env;
}

// The four connection vars the app + scripts read. When DEV_/PROD_-prefixed copies exist, APP_ENV
// selects which set fills them — so LOCALLY you flip one variable to point at the dummy DB or the real
// prod DB. On Vercel you just set the plain names (no prefixes) and this stays a no-op.
const CONN_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
];

/** Resolve APP_ENV → copy the DEV_/PROD_/NEWPROD_ set into the plain names.
 * `newprod` is a transient slot used only during a prod-DB migration (stand up + verify a new Supabase
 * project via `APP_ENV=newprod npm run db:migrate` without touching the live PROD_ keys). After cutover,
 * rename NEWPROD_* → PROD_* and this branch is simply unused. Returns "development"|"production"|"newprod". */
export function resolveEnv() {
  const raw = String(process.env.APP_ENV || "development").toLowerCase();
  const appEnv = raw === "production" ? "production" : raw === "newprod" ? "newprod" : "development";
  const prefix = appEnv === "production" ? "PROD_" : appEnv === "newprod" ? "NEWPROD_" : "DEV_";
  for (const name of CONN_VARS) {
    const picked = process.env[prefix + name];
    if (picked) process.env[name] = picked; // the selected set wins over any plain value
  }
  process.env.NEXT_PUBLIC_APP_ENV = appEnv;
  return appEnv;
}

// Prefer the working session-pooler URL; fall back to the direct DATABASE_URL.
export function dbUrl() {
  loadEnv();
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("No SUPABASE_DB_URL or DATABASE_URL in environment");
  return url;
}

export const ROOT = root;
