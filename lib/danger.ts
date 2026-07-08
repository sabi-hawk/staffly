// Platform-wide "danger password" — a SECOND secret (env `DANGER_PASSWORD`), required on top of being
// signed in as super_admin, before any super-admin HARD DELETE goes through. This protects crucial
// data even if someone has the owner's account email + password: they still can't permanently delete
// deals, payroll, employees, CRM records, etc. without the separate danger password. Server-only.
//
// Activation is opt-in by configuration: the gate is ACTIVE only when DANGER_PASSWORD is set. When it
// is unset the app behaves as before (super-admin deletes proceed), so pulling this change never locks
// anyone out — the owner turns the protection on by setting the env var. (See DECISIONS #98.)
import { NextResponse } from "next/server";
import { isSuperAdminRole } from "@/lib/crm/access";
import { DANGER_HEADER, dangerConfigured, verifyDangerPassword } from "@/lib/danger-core";

export { DANGER_HEADER, dangerConfigured, verifyDangerPassword };

/**
 * Route guard for a super-admin hard delete. Returns a 403 NextResponse to short-circuit the handler,
 * or null when the delete may proceed. Only super admins are gated (the protection is about a
 * compromised OWNER account); non-super deletes are unaffected. No-op when unconfigured.
 */
export function requireDangerForSuper(req: Request, role: string | null | undefined): NextResponse | null {
  if (!isSuperAdminRole(role)) return null;   // only gate super-admin deletes
  if (!dangerConfigured()) return null;         // protection off until DANGER_PASSWORD is set
  const supplied = req.headers.get(DANGER_HEADER);
  if (!verifyDangerPassword(supplied)) {
    return NextResponse.json(
      { error: "Danger password required", danger: true },
      { status: 403 }
    );
  }
  return null;
}
