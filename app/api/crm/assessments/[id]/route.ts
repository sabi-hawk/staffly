import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isBdLead, isUuid } from "@/lib/crm/access";
import { updateAssessment } from "@/lib/services/crm-activity";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    if (!isBdLead(me)) delete body.owner_bd_id;
    await updateAssessment(createClient(), params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: docs } = await supabase.from("assessment_documents").select("file_path").eq("assessment_id", params.id);
  const { error } = await supabase.from("assessments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const paths = (docs ?? []).map((d) => d.file_path);
  if (paths.length) {
    const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove(paths);
    if (sErr) console.error("crm-docs remove failed (assessment delete)", sErr.message);
  }
  return NextResponse.json({ ok: true });
}
