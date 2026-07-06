import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isUuid } from "@/lib/crm/access";

// Assign a role to a user (users.assign_roles — super-admin by default; the DB guard trigger also
// enforces super-admin on app_role_id/role changes). Assignment syncs:
//  - profiles.role to the role's base_role (the legacy RLS ceiling for unmigrated tables), and
//  - the bd-lead / deal-developer capability flags to match role semantics.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.usersAssignRoles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const { role_id } = await req.json();
    if (!isUuid(role_id)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const supabase = createClient();
    const { data: role } = await supabase.from("app_roles").select("key, base_role").eq("id", role_id).single();
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    if (params.id === me.id && role.key !== "super_admin") {
      return NextResponse.json({ error: "You can't demote your own account — ask the other super-admin." }, { status: 400 });
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        app_role_id: role_id,
        role: role.base_role,
        is_bd_lead: role.key === "bd_lead",
        is_deal_developer: role.key === "deal_developer",
      })
      .eq("id", params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
