import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";

// Create a CUSTOM role (roles.manage; RLS enforces too). Custom roles get base_role='employee' — the
// safest legacy ceiling: access comes only from the permissions granted here (FRD-08 §5).
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.rolesManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const name = (body.name ?? "").trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
    if (!key) return NextResponse.json({ error: "Name must contain letters/numbers" }, { status: 400 });
    const grants: string[] = Array.isArray(body.permissions) ? body.permissions.filter((p: unknown) => typeof p === "string") : [];

    const supabase = createClient();
    const { data: role, error } = await supabase
      .from("app_roles")
      .insert({
        key,
        name,
        description: (body.description ?? "").trim().slice(0, 300) || null,
        reason: (body.reason ?? "").trim().slice(0, 500) || null,
        is_system: false,
        base_role: "employee",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "A role with a similar name already exists" : error.message);
    if (grants.length) {
      const { error: gErr } = await supabase
        .from("role_permissions")
        .insert(grants.map((permission_key) => ({ role_id: role.id, permission_key })));
      if (gErr) throw new Error(gErr.message);
    }
    return NextResponse.json({ ok: true, id: role.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
