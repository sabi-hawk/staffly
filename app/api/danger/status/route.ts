import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/crm/access";
import { dangerConfigured } from "@/lib/danger";

// Whether the danger-password gate is active for the caller. The client uses this to decide whether a
// destructive action must prompt for the danger password. Super-admin only (nobody else is gated).
export async function GET() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ configured: isSuperAdminRole(me.role) && dangerConfigured() });
}
