// Server-side option-list fetchers for CRM forms (profiles, developers, BDs).
// RLS scopes profiles to what the caller may see.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Opt = { id: string; label: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function crmProfileOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("dev_profiles").select("id, name, stack:dev_stacks(name)").order("name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.stack?.name ? `${p.name} — ${p.stack.name}` : p.name }));
}

export async function developerOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("profiles").select("id, full_name").eq("is_developer", true).order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name }));
}

export async function bdOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase
    .from("profiles").select("id, full_name").eq("department", "Business Development").order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name }));
}
