import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole, isUuid } from "@/lib/crm/access";
import { addDevProfileDocument, CRM_DOCS_BUCKET, DOC_MIME, DOC_MAX_BYTES } from "@/lib/services/dev-profiles";

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Verify the file's leading bytes match the claimed MIME (don't trust the browser Content-Type).
function magicMatches(mime: string, bytes: Uint8Array): boolean {
  const b = bytes;
  switch (mime) {
    case "application/pdf": return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
    case "image/png": return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; // \x89PNG
    case "image/jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/webp": return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46; // RIFF
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return b[0] === 0x50 && b[1] === 0x4b; // PK zip (docx)
    case "application/msword": return b[0] === 0xd0 && b[1] === 0xcf; // OLE (legacy .doc)
    default: return false;
  }
}

// Upload a resume / cover letter to the private crm-docs bucket (admin/super-admin only).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const docType = (form.get("doc_type") as string) === "cover_letter" ? "cover_letter" : "resume";
  const label = (form.get("label") as string) || null;
  const isPrimary = form.get("is_primary") === "true";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!DOC_MIME.includes(file.type)) return NextResponse.json({ error: "Use PDF, DOC/DOCX or an image" }, { status: 400 });
  if (file.size > DOC_MAX_BYTES) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(file.type, buf)) {
    return NextResponse.json({ error: "File content does not match its type" }, { status: 400 });
  }

  const ext = EXT[file.type] ?? "bin";
  const objectPath = `${params.id}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(CRM_DOCS_BUCKET)
    .upload(objectPath, buf, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  try {
    await addDevProfileDocument(createClient(), {
      dev_profile_id: params.id,
      doc_type: docType,
      label,
      is_primary: isPrimary,
      file_path: objectPath,
      file_name: file.name,
      uploaded_by: me.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // roll back the orphaned upload on a DB failure
    await admin.storage.from(CRM_DOCS_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
