// Pure danger-password helpers (no next/server import, so unit-testable and usable anywhere). See
// lib/danger.ts for the route guard that builds on these. Server-only by usage (reads process.env).
import { timingSafeEqual } from "crypto";

export const DANGER_HEADER = "x-danger-password";

/** True when the danger-password protection is configured (env secret present). */
export function dangerConfigured(): boolean {
  return !!process.env.DANGER_PASSWORD;
}

/** Constant-time check of a supplied danger password against the env secret. */
export function verifyDangerPassword(supplied: string | null | undefined): boolean {
  const secret = process.env.DANGER_PASSWORD;
  if (!secret) return false; // not configured → cannot verify
  const a = Buffer.from(supplied ?? "");
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
