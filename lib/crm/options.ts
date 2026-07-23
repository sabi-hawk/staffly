// Server-side option-list fetchers for CRM forms (profiles, developers, BDs).
// RLS scopes profiles to what the caller may see.
import type { SupabaseClient } from "@supabase/supabase-js";
import { receivingAccountLabel } from "@/lib/crm/receiving";

export type Opt = { id: string; label: string; sublabel?: string; color?: string; mine?: boolean };

/* eslint-disable @typescript-eslint/no-explicit-any */
// `mineId` (the current BD): profiles that BD owns are flagged `mine` so a BD-Lead who sees ALL profiles
// can still spot their own at a glance (a "You" marker in the picker).
export async function crmProfileOptions(supabase: SupabaseClient, mineId?: string): Promise<Opt[]> {
  // Rich two-line card in the combobox: "#14 Ali Ahmad · Backend" with the email underneath, so two
  // profiles that share a name/stack are still distinguishable by email (0043 + owner 2026-07-15).
  const { data } = await supabase.from("dev_profiles").select("id, profile_no, name, email, color, owner_bd_id, stack:dev_stacks(name)").order("profile_no");
  const rows = (data ?? []).map((p: any) => ({
    id: p.id,
    label: `#${p.profile_no} ${p.name}${p.stack?.name ? ` · ${p.stack.name}` : ""}`,
    sublabel: p.email ?? undefined,
    // colour by the PROFILE (each is distinct), not the stack (same-stack profiles would share a colour)
    color: p.color ?? undefined,
    mine: mineId ? p.owner_bd_id === mineId : undefined,
  }));
  // Show the BD's own profiles first so they're easy to reach, then the rest.
  return mineId ? rows.sort((a, b) => Number(!!b.mine) - Number(!!a.mine)) : rows;
}

export async function developerOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("profiles").select("id, full_name, position, color").eq("is_developer", true).order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, sublabel: p.position ?? undefined, color: p.color ?? undefined }));
}

/** Working members for a deal — developers OR designers (a deal can be design work, not just dev). Kept
 * separate from developerOptions so designers don't leak into the interview/assessment "given by" picker. */
export async function dealMemberOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("profiles").select("id, full_name, position, color").or("is_developer.eq.true,is_designer.eq.true").order("full_name");
  return (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name, sublabel: p.position ?? undefined, color: p.color ?? undefined }));
}

/** Distinct existing company names across deals — feeds the creatable Company picker so a new deal can
 * reuse an existing company's exact spelling (that's what rolls several deals up under one company). */
export async function companyNameOptions(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("deals").select("name").not("name", "is", null).order("name");
  const seen = new Map<string, string>();
  for (const r of (data ?? []) as any[]) {
    const nm = (r.name ?? "").trim();
    if (nm && !seen.has(nm.toLowerCase())) seen.set(nm.toLowerCase(), nm);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/** The deals an employee is on — primary/secondary BD owner, closer, or a working member — as rich
 * two-line options (Company · Designation · #code / Profile · stack · email + colour). Reused by the
 * deal-commission editor and the payroll "add commission" flow. */
export async function employeeDealOptions(supabase: SupabaseClient, employeeId: string): Promise<Opt[]> {
  const ddRows = (await supabase.from("deal_developers").select("deal_id").eq("developer_id", employeeId)).data ?? [];
  const memberDealIds = Array.from(new Set(ddRows.map((r: any) => r.deal_id)));
  const orParts = [`owner_bd_id.eq.${employeeId}`, `secondary_owner_bd_id.eq.${employeeId}`, `closer_id.eq.${employeeId}`];
  if (memberDealIds.length) orParts.push(`id.in.(${memberDealIds.join(",")})`);
  const rows = (await supabase.from("deals").select("id, name, designation, deal_code, lead:leads(company), profile:dev_profiles(name, email, color, stack:dev_stacks(name))").or(orParts.join(",")).order("created_at", { ascending: false })).data ?? [];
  return rows.map((d: any) => {
    const company = d.name || d.lead?.company || "Deal";
    const profileBits = [d.profile?.name, d.profile?.stack?.name, d.profile?.email].filter(Boolean).join(" · ");
    return { id: d.id, label: `${company}${d.designation ? ` · ${d.designation}` : ""} · #${d.deal_code}`, sublabel: profileBits || undefined, color: d.profile?.color ?? undefined };
  });
}

/** Active assessment categories (configurable taxonomy, like dev_stacks) for the assessment form. */
export async function assessmentCategoryOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("assessment_categories").select("id, name").eq("is_active", true).order("sort_order").order("name");
  return (data ?? []).map((c: any) => ({ id: c.id, label: c.name }));
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
  const { data } = await supabase.from("receiving_accounts").select("id, type, label, holder_name, bank_name, account_number, email").eq("is_active", true).order("type").order("holder_name");
  return (data ?? []).map((a: any) => ({ id: a.id, label: receivingAccountLabel(a) }));
}

export async function methodOptions(supabase: SupabaseClient): Promise<Opt[]> {
  const { data } = await supabase.from("payment_methods").select("id, name").eq("is_active", true).order("sort_order");
  return (data ?? []).map((m: any) => ({ id: m.id, label: m.name }));
}
