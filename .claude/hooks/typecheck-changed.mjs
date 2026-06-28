#!/usr/bin/env node
// PostToolUse hook (matcher: Write|Edit|MultiEdit).
// Lightweight guard for the RSC boundary bug class that bit us twice: importing a value/function
// from a "use client" module into a server file yields a client-reference proxy (0-row grids,
// "x is not a function"). Warns (non-blocking) when an edited server file imports from a known
// client component. Best-effort: never blocks edits.
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const readStdin = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
};
const collectPaths = (input) => {
  const ti = input?.tool_input ?? {};
  const out = new Set();
  if (typeof ti.file_path === "string") out.add(ti.file_path);
  if (Array.isArray(ti.edits)) for (const e of ti.edits) if (typeof e?.file_path === "string") out.add(e.file_path);
  return [...out];
};

const main = async () => {
  let input;
  try { input = JSON.parse(await readStdin()); } catch { process.exit(0); }
  for (const p of collectPaths(input)) {
    if (![".ts", ".tsx"].includes(extname(p))) continue;
    if (/[/\\]node_modules[/\\]/.test(p)) continue;
    let src = "";
    try { src = readFileSync(p, "utf8"); } catch { continue; }
    const isClient = /^\s*["']use client["']/.test(src);
    // a server file (no "use client") importing a non-type value from a components/* path
    if (!isClient && /from\s+["']@\/components\//.test(src) && !/^\s*\/\//.test(src)) {
      // only warn if it imports a non-Component identifier (lowercase first letter) — heuristic
      const m = src.match(/import\s+\{([^}]+)\}\s+from\s+["']@\/components\/[^"']+["']/g) || [];
      const suspicious = m.some((line) => /\b[a-z][A-Za-z0-9]*\b/.test(line.replace(/import\s+\{|\}.*/g, "")));
      if (suspicious) {
        process.stderr.write(
          `[hint] ${p} (server file) imports from @/components/* — if you imported a helper/const/function ` +
          `from a "use client" module, move it to lib/* instead (RSC client-reference pitfall). See .claude/rules/conventions.md\n`
        );
      }
    }
  }
  process.exit(0); // never block
};
main();
