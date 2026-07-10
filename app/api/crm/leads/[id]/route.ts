import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { canSeeCrm, isBdLead, isSuperAdminRole, isUuid } from "@/lib/crm/access";
import { requireDangerForSuper } from "@/lib/danger";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";
import { updateLead, disqualifyLead, requalifyLead } from "@/lib/services/crm-activity";

// super admin OR crm.records.delete (partners) may hard-delete; a plain BD dismisses via status.
const canManageRecords = (me: Awaited<ReturnType<typeof getCurrentProfile>>) =>
  !!me && (isSuperAdminRole(me.role) || hasPermP(me, PERM.crmRecordsDelete));

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

// Hard-delete a whole lead thread (cascades its interviews, assessments, contacts, alerts & documents;
// any deal keeps its history with lead_id nulled). super admin OR crm.records.delete; a BD dismisses.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageRecords(me)) return NextResponse.json({ error: "You can't delete this lead" }, { status: 403 });
  const gate = requireDangerForSuper(req, me.role); if (gate) return gate;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  // gather storage paths (lead docs + docs on the lead's assessments) before the cascade removes the rows
  const [{ data: leadDocs }, { data: asmts }] = await Promise.all([
    supabase.from("lead_documents").select("file_path").eq("lead_id", params.id),
    supabase.from("assessments").select("id").eq("lead_id", params.id),
  ]);
  let asmtDocs: { file_path: string }[] = [];
  if ((asmts ?? []).length) {
    const { data } = await supabase.from("assessment_documents").select("file_path").in("assessment_id", (asmts ?? []).map((a) => a.id));
    asmtDocs = data ?? [];
  }
  const { error } = await supabase.from("leads").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const paths = [...(leadDocs ?? []), ...asmtDocs].map((d) => d.file_path).filter(Boolean);
  if (paths.length) {
    const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove(paths);
    if (sErr) console.error("crm-docs remove failed (lead delete)", sErr.message);
  }
  return NextResponse.json({ ok: true });
}
