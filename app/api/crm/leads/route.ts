import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, crmOwnerId } from "@/lib/crm/access";
import { createLead } from "@/lib/services/crm-activity";

// Create a lead. BD → owns it; BD-Lead/admin may assign to any BD. RLS also enforces.
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const id = await createLead(createClient(), { ...body, owner_bd_id: crmOwnerId(me, body.owner_bd_id) });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
