// Server-side option-list fetchers for CRM forms (profiles, developers, BDs).
// RLS scopes profiles to what the caller may see.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Opt = { id: string; label: string; sublabel?: string; color?: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function crmProfileOptions(supabase: SupabaseClient): Promise<Opt[]> {
  // Rich two-line card in the combobox: "#14 Ali Ahmad · Backend" with the email underneath, so two
  // profiles that share a name/stack are still distinguishable by email (0043 + owner 2026-07-15).
  const { data } = await supabase.from("dev_profiles").select("id, profile_no, name, email, color, stack:dev_stacks(name)").order("profile_no");
  return (data ?? []).map((p: any) => ({
    id: p.id,
    label: `#${p.profile_no} ${p.name}${p.stack?.name ? ` · ${p.stack.name}` : ""}`,
    sublabel: p.email ?? undefined,
    // colour by the PROFILE (each is distinct), not the stack (same-stack profiles would share a colour)
    color: p.color ?? undefined,
  }));
}

export async function developerOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("profiles").select("id, full_name, position, color").eq("is_developer", true).order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, sublabel: p.position ?? undefined, color: p.color ?? undefined }));
}

/** Every active person (any department) — a closer can be anyone who landed the deal, not just a dev. */
export async function peopleOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase
    .from("profiles").select("id, full_name, position, color")
    .eq("status", "active").neq("role", "super_admin").order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, sublabel: p.position ?? undefined, color: p.color ?? undefined }));
}

/** People eligible to be a deal CLOSER (profiles flagged is_closer). Set the flag on the employee page. */
export async function closerOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase
    .from("profiles").select("id, full_name, position, color")
    .eq("is_closer", true).eq("status", "active").order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, sublabel: p.position ?? undefined, color: p.color ?? undefined }));
}

export async function bdOptions(supabase: SupabaseClient): Promise<Opt[]> {
  // RBAC is the truth for "who is a BD", not the free-text department field. A Partner (BD) counts too
  // — they own deals/profiles like a BD Lead.
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, color, app_roles!profiles_app_role_id_fkey!inner(key)")
    .in("app_roles.key", ["bd", "bd_lead", "partner_bd"])
    .order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, color: p.color ?? undefined }));
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
