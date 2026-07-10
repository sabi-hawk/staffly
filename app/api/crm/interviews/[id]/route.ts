import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { canSeeCrm, isBdLead, isSuperAdminRole, isUuid } from "@/lib/crm/access";
import { requireDangerForSuper } from "@/lib/danger";
import { updateInterview, dismissActivity, restoreActivity } from "@/lib/services/crm-activity";

// Hard-delete / restore of CRM activity records: super admin OR the crm.records.delete permission
// (the partner roles). A plain BD only dismisses.
const canManageRecords = (me: Awaited<ReturnType<typeof getCurrentProfile>>) =>
  !!me && (isSuperAdminRole(me.role) || hasPermP(me, PERM.crmRecordsDelete));

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
      if (!canManageRecords(me)) return NextResponse.json({ error: "You can't restore a dismissed record" }, { status: 403 });
      await restoreActivity(createClient(), "interviews", params.id); return NextResponse.json({ ok: true });
    }
    if (!isBdLead(me)) delete body.owner_bd_id;
    await updateInterview(createClient(), params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Hard delete = super admin OR crm.records.delete (partners); a plain BD dismisses (RLS also enforces).
  if (!canManageRecords(me)) return NextResponse.json({ error: "You can't delete this record" }, { status: 403 });
  const gate = requireDangerForSuper(req, me.role); if (gate) return gate;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { error } = await createClient().from("interviews").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
