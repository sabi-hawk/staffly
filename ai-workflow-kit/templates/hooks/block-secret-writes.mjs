#!/usr/bin/env node
// PreToolUse hook (matcher: Write|Edit|MultiEdit). Generic, stack-agnostic.
// Blocks writing/editing secret/credential files. Reads tool-call JSON from stdin; exits 2 to BLOCK.
// Add project-specific names to BLOCKED (e.g. a local CREDENTIALS.md).
import { basename } from "node:path";

const BLOCKED = [
  /^\.env$/i,
  /^\.env\.(?!example$)[^/\\]+$/i, // .env.* but NOT .env.example
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /(^|[/\\])secrets?([/\\]|$)/i,
  // /^CREDENTIALS\.md$/i,   // ← uncomment if the project keeps a local credentials doc
];

const readStdin = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
};
const extractPaths = (input) => {
  const ti = input?.tool_input ?? {};
  const paths = [];
  if (typeof ti.file_path === "string") paths.push(ti.file_path);
  if (typeof ti.path === "string") paths.push(ti.path);
  if (Array.isArray(ti.edits)) for (const e of ti.edits) if (typeof e?.file_path === "string") paths.push(e.file_path);
  return paths;
};
const isBlocked = (p) => { const n = basename(p); return BLOCKED.some((re) => re.test(n) || re.test(p)); };

const main = async () => {
  let input;
  try { input = JSON.parse(await readStdin()); } catch { process.exit(0); }
  const bad = extractPaths(input).filter(isBlocked);
  if (bad.length) {
    process.stderr.write("Blocked: writing secret/credential files is not allowed:\n" + bad.map((p) => `  - ${p}`).join("\n") + "\nOnly .env.example may be edited.\n");
    process.exit(2);
  }
  process.exit(0);
};
main();
