import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isSuperAdminRole, isUuid } from "@/lib/crm/access";
import { readValidatedDoc, stageCrmDoc } from "@/lib/crm/doc-upload";

// Upload a deal document (admin/super-admin only) to the private crm-docs bucket.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.dealsManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const v = await readValidatedDoc(req);
  if ("error" in v) return NextResponse.json({ error: v.error.message }, { status: v.error.status });

  const staged = await stageCrmDoc(`deals/${params.id}`, v.file, v.buf);
  if ("error" in staged) return NextResponse.json({ error: staged.error.message }, { status: staged.error.status });

  const { error } = await createClient().from("deal_documents").insert({
    deal_id: params.id, label: (v.form.get("label") as string) || null,
    file_path: staged.objectPath, file_name: v.file.name, uploaded_by: me.id,
  });
  if (error) {
    await staged.rollback();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
