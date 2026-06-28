#!/usr/bin/env node
// PreToolUse hook (matcher: Write|Edit|MultiEdit).
// Blocks writing/editing secret, env, or credential files. Reads the tool-call JSON from
// stdin; exits 2 (with a stderr message) to BLOCK. Node-only (no shell), cross-platform.
import { basename } from "node:path";

const BLOCKED = [
  /^\.env$/i,
  /^\.env\.(?!example$)[^/\\]+$/i, // .env.local, .env.production … (NOT .env.example)
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /(^|[/\\])secrets?([/\\]|$)/i,
  /^CREDENTIALS\.md$/i, // local-only credentials doc (git-ignored)
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

const isBlocked = (p) => {
  const name = basename(p);
  return BLOCKED.some((re) => re.test(name) || re.test(p));
};

const main = async () => {
  let input;
  try { input = JSON.parse(await readStdin()); } catch { process.exit(0); }
  const offending = extractPaths(input).filter(isBlocked);
  if (offending.length) {
    process.stderr.write(
      "Blocked by security hook: writing secret/credential files is not allowed:\n" +
        offending.map((p) => `  - ${p}`).join("\n") +
        "\nOnly .env.example may be edited. See .claude/rules/security.md\n"
    );
    process.exit(2);
  }
  process.exit(0);
};
main();
