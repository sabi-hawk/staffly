import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { requireDangerForSuper } from "@/lib/danger";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";
import { safeDownloadName, streamCrmDownload } from "@/lib/crm/doc-download";

// Download an assessment document (RLS-checked read + audit log). Streams through us so the saved
// filename matches the UI (a redirect to storage would use the random object path).
export async function GET(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { data: doc } = await createClient()
    .from("assessment_documents")
    .select("id, file_path, file_name, label, assessment_id")
    .eq("id", params.docId)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await createAdminClient().from("audit_log").insert({
    actor_id: me.id, actor_email: me.email, actor_role: me.role,
    action: "download", entity: "assessment_documents", entity_id: doc.id,
    after: { file_name: doc.file_name, assessment_id: doc.assessment_id },
  });
  return streamCrmDownload(doc.file_path, safeDownloadName(doc.label ?? null, doc.file_name));
}

// Delete an assessment document (owner BD or admin; RLS enforces) + remove the storage object.
export async function DELETE(req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const gate = requireDangerForSuper(req, me.role); if (gate) return gate;
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("assessment_documents")
    .select("id, file_path")
    .eq("id", params.docId)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await supabase.from("assessment_documents").delete().eq("id", params.docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove([doc.file_path]);
  if (sErr) console.error("crm-docs remove failed", doc.file_path, sErr.message);
  return NextResponse.json({ ok: true });
}
