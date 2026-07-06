// Server-side permission helpers (FRD-08). Fetch the caller's grant set ONCE per request and check
// keys in-process — pages/routes/nav all share the same set instead of N RPC round-trips.
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { PermKey } from "./permissions";

/** All permission keys granted to `userId` via their app_role. */
export async function permsForUser(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("profiles")
    .select("app_role_id, app_roles!profiles_app_role_id_fkey(role_permissions(permission_key))")
    .eq("id", userId)
    .maybeSingle();
  const rows = (data as any)?.app_roles?.role_permissions ?? [];
  return new Set(rows.map((r: any) => r.permission_key as string));
}

/** The current request's grant set (memoised per server render via React cache). */
export const getMyPerms = cache(async (): Promise<Set<string>> => {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Set();
  return permsForUser(supabase, auth.user.id);
});

export async function hasPerm(perm: PermKey): Promise<boolean> {
  return (await getMyPerms()).has(perm);
}
