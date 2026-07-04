import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/crm/docs";

// Signed-URL download of a lead document. Owner-scoped: the RLS-bound select only returns a doc whose
// parent lead the caller may see (BD owner / BD-Lead / admin).
export async function GET(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { data: doc } = await createClient()
    .from("lead_documents").select("id, file_path, file_name").eq("id", params.docId).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: signed, error } = await createAdminClient().storage
    .from(CRM_DOCS_BUCKET).createSignedUrl(doc.file_path, 60, { download: doc.file_name ?? true });
  if (error || !signed) return NextResponse.json({ error: error?.message ?? "Sign failed" }, { status: 400 });
  return NextResponse.redirect(signed.signedUrl);
}

export async function DELETE(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: doc } = await supabase.from("lead_documents").select("id, file_path").eq("id", params.docId).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await supabase.from("lead_documents").delete().eq("id", params.docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove([doc.file_path]);
  if (sErr) console.error("crm-docs remove failed", doc.file_path, sErr.message);
  return NextResponse.json({ ok: true });
}
