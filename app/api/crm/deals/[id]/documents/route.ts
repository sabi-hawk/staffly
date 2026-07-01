import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole, isUuid } from "@/lib/crm/access";
import { EXT, magicMatches } from "@/lib/crm/docs";
import { CRM_DOCS_BUCKET, DOC_MIME, DOC_MAX_BYTES } from "@/lib/services/dev-profiles";

// Upload a deal document (admin/super-admin only) to the private crm-docs bucket.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const label = (form.get("label") as string) || null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!DOC_MIME.includes(file.type)) return NextResponse.json({ error: "Use PDF, DOC/DOCX or an image" }, { status: 400 });
  if (file.size > DOC_MAX_BYTES) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(file.type, buf)) return NextResponse.json({ error: "File content does not match its type" }, { status: 400 });

  const objectPath = `deals/${params.id}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from(CRM_DOCS_BUCKET).upload(objectPath, buf, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { error } = await createClient().from("deal_documents").insert({
    deal_id: params.id, label, file_path: objectPath, file_name: file.name, uploaded_by: me.id,
  });
  if (error) {
    await admin.storage.from(CRM_DOCS_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
