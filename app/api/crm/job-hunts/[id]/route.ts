import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isUuid } from "@/lib/crm/access";

const clean = (v: unknown) => (typeof v === "string" ? (v.trim() || null) : v);

// PATCH — the OWNER (or super) may edit any field; ANY BD may edit the shared `feedback` and dismiss/
// restore a row. Column-level enforcement lives here (RLS is permissive for the shared board).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmAccess)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = createClient();
  const { data: row } = await supabase.from("job_hunts").select("owner_bd_id").eq("id", params.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = row.owner_bd_id === me.id || me.role === "super_admin";

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  // shared field: anyone may set feedback
  if ("feedback" in body) update.feedback = clean(body.feedback);
  // owner-only fields
  if (isOwner) {
    for (const k of ["company", "position", "job_post_url"] as const) if (k in body) update[k] = clean(body[k]);
    if ("stack_id" in body) update.stack_id = body.stack_id || null;
  }
  // dismiss / restore: any BD (soft-hide, kept for the record)
  if ("dismissed" in body) {
    update.dismissed = !!body.dismissed;
    update.dismissed_by = body.dismissed ? me.id : null;
    update.dismissed_at = body.dismissed ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update (you can only edit the feedback on another BD's row)" }, { status: 403 });

  const { error } = await supabase.from("job_hunts").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE — owner or super only (RLS enforces).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { error } = await createClient().from("job_hunts").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
