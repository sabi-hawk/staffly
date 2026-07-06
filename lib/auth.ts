import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { PermKey } from "@/lib/access/permissions";

/**
 * Current authenticated user's profile (server-side), or null. Since FRD-08 the profile carries the
 * caller's permission grants (`perms: string[]`, from app_role → role_permissions) in the same single
 * query — so the shared access helpers (lib/crm/access.ts, hasPermP below) are permission-driven
 * everywhere without extra round-trips. Plain array (not a Set) so it survives server→client props.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*, app_roles!profiles_app_role_id_fkey(key, name, role_permissions(permission_key))")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  const { app_roles, ...profile } = data as any;
  profile.perms = (app_roles?.role_permissions ?? []).map((r: any) => r.permission_key as string);
  profile.app_role_key = app_roles?.key ?? null;
  profile.app_role_name = app_roles?.name ?? null;
  return profile as Profile;
}

/** Does this (getCurrentProfile-loaded) profile hold a permission? Sync — usable in JSX conditionals. */
export function hasPermP(p: Pick<Profile, "perms"> | null | undefined, perm: PermKey): boolean {
  return !!p?.perms?.includes(perm);
}

export function isAdmin(role?: string) {
  return role === "admin" || role === "super_admin";
}
export function isSuperAdmin(role?: string) {
  return role === "super_admin";
}

import type { SupabaseClient } from "@supabase/supabase-js";
/** Role of a user id via the given (request-scoped) client. */
export async function roleOf(supabase: SupabaseClient, userId: string): Promise<string | undefined> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role;
}

/** Permission check for API routes that only hold a session client (uses the caller's own JWT). */
export async function sessionHasPerm(supabase: SupabaseClient, perm: PermKey): Promise<boolean> {
  const { data } = await supabase.rpc("auth_has_perm", { p_perm: perm });
  return data === true;
}
