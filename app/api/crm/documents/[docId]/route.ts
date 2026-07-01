import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole, isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";

// Make a resume the primary one (admin/super-admin only) — atomic via a DB function.
export async function PATCH(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { error } = await createClient().rpc("crm_set_primary_document", { p_doc_id: params.docId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Delete a document (admin/super-admin only) — removes the storage object too.
export async function DELETE(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("dev_profile_documents")
    .select("id, file_path")
    .eq("id", params.docId)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { error } = await supabase.from("dev_profile_documents").delete().eq("id", params.docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: storageErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove([doc.file_path]);
  if (storageErr) console.error("crm-docs remove failed", doc.file_path, storageErr.message);
  return NextResponse.json({ ok: true });
}
