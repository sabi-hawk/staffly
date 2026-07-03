import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole, isUuid } from "@/lib/crm/access";
import { readValidatedDoc, stageCrmDoc } from "@/lib/crm/doc-upload";
import { addDevProfileDocument } from "@/lib/services/dev-profiles";

// Upload a resume / cover letter to the private crm-docs bucket (admin/super-admin only).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const v = await readValidatedDoc(req);
  if ("error" in v) return NextResponse.json({ error: v.error.message }, { status: v.error.status });
  const docType = (v.form.get("doc_type") as string) === "cover_letter" ? "cover_letter" : "resume";
  const isPrimary = v.form.get("is_primary") === "true";

  const staged = await stageCrmDoc(params.id, v.file, v.buf);
  if ("error" in staged) return NextResponse.json({ error: staged.error.message }, { status: staged.error.status });

  try {
    await addDevProfileDocument(createClient(), {
      dev_profile_id: params.id,
      doc_type: docType,
      label: (v.form.get("label") as string) || null,
      is_primary: isPrimary,
      file_path: staged.objectPath,
      file_name: v.file.name,
      uploaded_by: me.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // roll back the orphaned upload on a DB failure
    await staged.rollback();
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
