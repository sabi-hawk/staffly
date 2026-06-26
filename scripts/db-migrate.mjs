// Non-interactive migration runner for the cloud Supabase DB.
// Applies supabase/migrations/*.sql in filename order, tracked in schema_migrations.
// Usage: npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { dbUrl, ROOT } from "./lib/env.mjs";

const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

async function main() {
  const client = new pg.Client({
    connectionString: dbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected to cloud DB.");

  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await client.query("select filename from schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`  apply ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations(filename) values ($1)", [file]);
      await client.query("commit");
      console.log("OK");
      count++;
    } catch (e) {
      await client.query("rollback");
      console.error(`FAILED\n${e.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log(`Done. ${count} migration(s) applied, ${files.length} total.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
