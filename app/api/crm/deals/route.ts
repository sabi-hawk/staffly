import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/crm/access";
import { createDeal } from "@/lib/services/crm-deals";

// Deals are admin/super-admin only.
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const id = await createDeal(createClient(), await req.json());
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
