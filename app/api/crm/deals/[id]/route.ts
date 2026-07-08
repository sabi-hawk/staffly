import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isSuperAdminRole, isUuid } from "@/lib/crm/access";
import { requireDangerForSuper } from "@/lib/danger";
import { updateDeal } from "@/lib/services/crm-deals";
import { CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.dealsManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await updateDeal(createClient(), params.id, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.dealsManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const gate = requireDangerForSuper(req, me.role); if (gate) return gate;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  // Collect the deal's document paths first (row cascade won't remove the storage objects).
  const { data: docs } = await supabase.from("deal_documents").select("file_path").eq("deal_id", params.id);
  const { error } = await supabase.from("deals").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const paths = (docs ?? []).map((d) => d.file_path);
  if (paths.length) {
    const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove(paths);
    if (sErr) console.error("crm-docs remove failed (deal delete)", sErr.message);
  }
  return NextResponse.json({ ok: true });
}
