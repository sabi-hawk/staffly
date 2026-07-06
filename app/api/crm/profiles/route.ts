import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isAdminRole } from "@/lib/crm/access";
import { createDevProfile } from "@/lib/services/dev-profiles";

// Create a dev profile (admin/super-admin only; RLS also enforces).
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmProfilesPassword)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const id = await createDevProfile(createClient(), await req.json());
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
