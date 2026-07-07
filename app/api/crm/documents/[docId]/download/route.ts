import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";
import { safeDownloadName, streamCrmDownload } from "@/lib/crm/doc-download";

// Signed-URL / streamed download for a CRM document. Access is enforced by RLS (the select returns
// the row only if the viewer may see it). Downloads stream through this route so the saved filename
// matches what the user sees in the UI (the redirect to storage would use the random object path).
// The access is audited (FRD-06 FR-8) since it is not a DB row-change.
export async function GET(_req: Request, { params }: { params: { docId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUuid(params.docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  // ?inline=1 → view in the browser (the eye-button viewer); default forces a file download.
  const inline = new URL(_req.url).searchParams.get("inline") === "1";

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("dev_profile_documents")
    .select("id, file_path, file_name, label, dev_profile_id")
    .eq("id", params.docId)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only PDF/images render in the in-app iframe viewer.
  const previewable = /\.(pdf|png|jpe?g|webp)$/i.test(doc.file_name ?? "");
  const admin = createAdminClient();

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

  // Inline view (the iframe): a short-lived signed URL is fine — the browser just renders it.
  if (inline && previewable) {
    const { data: signed, error } = await admin.storage.from(CRM_DOCS_BUCKET).createSignedUrl(doc.file_path, 60);
    if (error || !signed) return NextResponse.json({ error: error?.message ?? "Sign failed" }, { status: 400 });
    return NextResponse.redirect(signed.signedUrl);
  }

  // Download: stream the bytes through us so we control the saved filename (matches the UI label).
  return streamCrmDownload(doc.file_path, safeDownloadName(doc.label, doc.file_name));
}
