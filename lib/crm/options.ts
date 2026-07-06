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
  // RBAC is the truth for "who is a BD", not the free-text department field.
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, app_roles!profiles_app_role_id_fkey!inner(key)")
    .in("app_roles.key", ["bd", "bd_lead"])
    .order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name }));
}

export async function leadOptions(supabase: SupabaseClient): Promise<Opt[]> {
  // Active opportunities only — a deal shouldn't attach to a rejected/dismissed lead (FRD-07).
  const { data } = await supabase
    .from("leads").select("id, company, role")
    .in("status", ["in_progress", "on_hold", "closed"])
    .order("created_at", { ascending: false });
  return (data ?? []).map((l: any) => ({ id: l.id, label: l.role ? `${l.company} — ${l.role}` : l.company }));
}

// Recent-first {id, company} for the type-first Add flow's "existing company" picker (FRD-07).
export async function leadCompanyOptions(supabase: SupabaseClient): Promise<{ id: string; company: string }[]> {
  const { data } = await supabase
    .from("leads").select("id, company")
    .in("status", ["in_progress", "on_hold", "closed"])
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((l: any) => ({ id: l.id, company: l.company }));
}

export async function accountOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("receiving_accounts").select("id, holder_name, bank_name").eq("is_active", true).order("holder_name");
  return (data ?? []).map((a: any) => ({ id: a.id, label: a.bank_name ? `${a.holder_name} — ${a.bank_name}` : a.holder_name }));
}

export async function methodOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("payment_methods").select("id, name").eq("is_active", true).order("sort_order");
  return (data ?? []).map((m: any) => ({ id: m.id, label: m.name }));
}
