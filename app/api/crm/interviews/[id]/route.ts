import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isBdLead, isSuperAdminRole, isUuid } from "@/lib/crm/access";
import { updateInterview, dismissActivity, restoreActivity } from "@/lib/services/crm-activity";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    // Dismiss (any BD, own record) / restore (super admin only — RLS + DB trigger also enforce).
    if (body._dismiss) { await dismissActivity(createClient(), "interviews", params.id, body.reason); return NextResponse.json({ ok: true }); }
    if (body._restore) {
      if (!isSuperAdminRole(me.role)) return NextResponse.json({ error: "Only a super admin can restore a dismissed record" }, { status: 403 });
      await restoreActivity(createClient(), "interviews", params.id); return NextResponse.json({ ok: true });
    }
    if (!isBdLead(me)) delete body.owner_bd_id;
    await updateInterview(createClient(), params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Hard delete is super-admin only; a BD dismisses instead (RLS super_delete also enforces).
  if (!isSuperAdminRole(me.role)) return NextResponse.json({ error: "Only a super admin can delete a record" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { error } = await createClient().from("interviews").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
