import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Current authenticated user's profile (server-side), or null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
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
