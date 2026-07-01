import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isBdLead, isUuid } from "@/lib/crm/access";
import { updateLead, disqualifyLead, requalifyLead } from "@/lib/services/crm-activity";

// Update a lead, or run an action: { action: "disqualify", category, note } | { action: "requalify" }.
// RLS restricts a plain BD to their own leads; BD-Lead/admin can act on any.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const supabase = createClient();
    const body = await req.json();
    if (body.action === "disqualify") {
      await disqualifyLead(supabase, params.id, body.category, body.note, me.id);
    } else if (body.action === "requalify") {
      await requalifyLead(supabase, params.id);
    } else {
      if (!isBdLead(me)) delete body.owner_bd_id; // a plain BD can't reassign ownership
      await updateLead(supabase, params.id, body);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
