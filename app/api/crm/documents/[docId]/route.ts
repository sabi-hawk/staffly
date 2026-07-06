import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isAdminRole, canSeeCrm, isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET, setPrimaryDocument, setDocumentNote, softDeleteDocument } from "@/lib/services/dev-profiles";

// Owner BD (or admin/BD-Lead): mark a resume primary / set a purpose note / SOFT-delete a document.
// RLS enforces that the caller owns the parent profile. Hard delete is DELETE below (admin only).
export async function PATCH(req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    const supabase = createClient();
    if (body.action === "primary") await setPrimaryDocument(supabase, params.docId);
    else if (body.action === "note") await setDocumentNote(supabase, params.docId, typeof body.note === "string" ? body.note : null);
    else if (body.action === "delete") await softDeleteDocument(supabase, params.docId);
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Delete a document (admin/super-admin only) — removes the storage object too.
export async function DELETE(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmProfilesPassword)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
