import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isUuid } from "@/lib/crm/access";
import { requireDangerForSuper } from "@/lib/danger";
import { updateDevProfile, CRM_DOCS_BUCKET } from "@/lib/services/dev-profiles";

// Update a dev profile / (re)assign its owner (admin/super-admin only).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmProfilesManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await updateDevProfile(createClient(), params.id, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Hard-delete a dev profile (its documents/credentials/job-app rows cascade; leads/interviews/
// assessments/deals keep their history with dev_profile_id nulled). Manage permission + danger guard.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmProfilesManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const gate = requireDangerForSuper(req, me.role); if (gate) return gate;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: docs } = await supabase.from("dev_profile_documents").select("file_path").eq("dev_profile_id", params.id);
  const { error } = await supabase.from("dev_profiles").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
  if (paths.length) {
    const { error: sErr } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).remove(paths);
    if (sErr) console.error("crm-docs remove failed (profile delete)", sErr.message);
  }
  return NextResponse.json({ ok: true });
}
