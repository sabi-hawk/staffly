import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { readValidatedDoc, stageCrmDoc } from "@/lib/crm/doc-upload";

// Upload a resume/CV or extra file for an assessment (private crm-docs bucket). The owning BD may
// upload their own assessment's docs (RLS on assessment_documents enforces; also re-checked here).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const v = await readValidatedDoc(req);
  if ("error" in v) return NextResponse.json({ error: v.error.message }, { status: v.error.status });
  const docType = (v.form.get("doc_type") as string) === "resume_cv" ? "resume_cv" : "extra";

  const staged = await stageCrmDoc(`assessments/${params.id}`, v.file, v.buf);
  if ("error" in staged) return NextResponse.json({ error: staged.error.message }, { status: staged.error.status });

  // Insert via the user's RLS-bound client so only an authorized owner/admin can attach.
  const { error } = await createClient().from("assessment_documents").insert({
    assessment_id: params.id,
    doc_type: docType,
    label: (v.form.get("label") as string) || null,
    file_path: staged.objectPath,
    file_name: v.file.name,
    uploaded_by: me.id,
  });
  if (error) {
    await staged.rollback();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
