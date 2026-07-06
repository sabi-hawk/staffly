import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isUuid } from "@/lib/crm/access";

// Update a role's name/description/reason and REPLACE its permission grants (roles.manage; RLS too).
// System roles: grants + text are editable (the owner tunes defaults), key/base/is_system are not.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.rolesManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    const supabase = createClient();

    const meta: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) meta.name = body.name.trim().slice(0, 60);
    if (typeof body.description === "string") meta.description = body.description.trim().slice(0, 300) || null;
    if (typeof body.reason === "string") meta.reason = body.reason.trim().slice(0, 500) || null;
    if (Object.keys(meta).length) {
      const { error } = await supabase.from("app_roles").update(meta).eq("id", params.id);
      if (error) throw new Error(error.message);
    }

    if (Array.isArray(body.permissions)) {
      // Safety: never let the Super Admin role lose roles.manage (would lock everyone out of RBAC).
      const { data: role } = await supabase.from("app_roles").select("key").eq("id", params.id).single();
      const grants: string[] = body.permissions.filter((p: unknown) => typeof p === "string");
      if (role?.key === "super_admin" && !grants.includes(PERM.rolesManage)) {
        throw new Error("The Super Admin role must keep roles.manage.");
      }
      const { error: dErr } = await supabase.from("role_permissions").delete().eq("role_id", params.id);
      if (dErr) throw new Error(dErr.message);
      if (grants.length) {
        const { error: iErr } = await supabase
          .from("role_permissions")
          .insert(grants.map((permission_key) => ({ role_id: params.id, permission_key })));
        if (iErr) throw new Error(iErr.message);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Delete a CUSTOM role with no users assigned.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.rolesManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = createClient();
  const { data: role } = await supabase.from("app_roles").select("is_system").eq("id", params.id).single();
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "System roles can't be deleted" }, { status: 400 });
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("app_role_id", params.id);
  if ((count ?? 0) > 0) return NextResponse.json({ error: `Reassign the ${count} user(s) on this role first` }, { status: 400 });
  const { error } = await supabase.from("app_roles").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
