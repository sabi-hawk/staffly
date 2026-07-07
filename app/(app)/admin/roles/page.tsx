import { redirect } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RolesManager, type RoleRow } from "@/components/admin/roles-manager";
import type { PermRow } from "@/components/admin/role-editor";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";

// Roles & permissions (FRD-08 slice 3): the system defaults (with the reason each exists) + custom
// roles. Super-admin (roles.manage) tunes grants here; users get a role on their employee page.
export default async function RolesPage() {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.rolesManage)) redirect("/admin/dashboard");
  const supabase = createClient();

  const [{ data: roles }, { data: perms }, { data: users }] = await Promise.all([
    supabase.from("app_roles").select("id, key, name, description, reason, is_system, role_permissions(permission_key)").order("is_system", { ascending: false }).order("name"),
    supabase.from("permissions").select("key, module, label, description").order("module").order("label"),
    supabase.from("profiles").select("app_role_id"),
  ]);

  const counts = new Map<string, number>();
  for (const u of users ?? []) counts.set(u.app_role_id, (counts.get(u.app_role_id) ?? 0) + 1);

  const rows: RoleRow[] = (roles ?? []).map((r: any) => ({
    id: r.id, key: r.key, name: r.name, description: r.description, reason: r.reason,
    is_system: r.is_system,
    grants: (r.role_permissions ?? []).map((p: any) => p.permission_key),
    users: counts.get(r.id) ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; permissions</CardTitle>
        <CardDescription>
          Every role&apos;s permission grants. The system defaults carry the reason they exist and can&apos;t be
          deleted. Create custom roles from the same catalog; assign a role on the employee&apos;s page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RolesManager roles={rows} catalog={(perms ?? []) as PermRow[]} />
      </CardContent>
    </Card>
  );
}
