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
