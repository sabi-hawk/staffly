import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";

// Signed-URL download for a CRM document. Access is enforced by RLS: the select below returns the
// row only if the viewer is allowed to see it (admin/BD-Lead, or the owning BD). The download is
// recorded as an audit event (FRD-06 FR-8) since it is not a DB row-change.
export async function GET(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  // ?inline=1 → view in the browser (the eye-button viewer); default forces a file download.
  const inline = new URL(_req.url).searchParams.get("inline") === "1";

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("dev_profile_documents")
    .select("id, file_path, file_name, dev_profile_id")
    .eq("id", params.docId)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only PDF/images render in the in-app iframe viewer; DOC/DOCX can't, so always force a download
  // for those even on the inline path (avoids a blank viewer with no filename).
  const previewable = /\.(pdf|png|jpe?g|webp)$/i.test(doc.file_name ?? "");
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from(CRM_DOCS_BUCKET)
    .createSignedUrl(doc.file_path, 60, inline && previewable ? {} : { download: doc.file_name ?? true });
  if (error || !signed) return NextResponse.json({ error: error?.message ?? "Sign failed" }, { status: 400 });

  // Audit the access (service-role insert — audit_log has no INSERT policy for regular users).
  await admin.from("audit_log").insert({
    actor_id: me.id,
    actor_email: me.email,
    actor_role: me.role,
    action: inline ? "view" : "download",
    entity: "dev_profile_documents",
    entity_id: doc.id,
    after: { file_name: doc.file_name, dev_profile_id: doc.dev_profile_id },
  });

  return NextResponse.redirect(signed.signedUrl);
}
