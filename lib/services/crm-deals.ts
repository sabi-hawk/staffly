// CRM Deals service (admin/super-admin only — RLS enforces). Injected Supabase client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeRichText } from "@/lib/sanitize";

function pick(input: Record<string, unknown>, fields: string[]) {
  const row: Record<string, unknown> = {};
  for (const k of fields) {
    if (input[k] === undefined) continue;
    row[k] = input[k] === "" ? null : input[k];
  }
  if (row.notes !== undefined && row.notes !== null) row.notes = sanitizeRichText(row.notes as string);
  return row;
}

const DEAL_FIELDS = [
  "name", "lead_id", "designation", "joining_date", "dev_profile_id", "working_developer", "closer_id",
  "owner_bd_id", "salary", "receiving_account_id", "payment_method_id", "profile_dob", "status", "notes",
];
const ACCOUNT_FIELDS = ["holder_name", "bank_name", "account_number", "notes", "is_active"];
const METHOD_FIELDS = ["name", "sort_order", "is_active"];

async function ins(supabase: SupabaseClient, table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
async function upd(supabase: SupabaseClient, table: string, id: string, row: Record<string, unknown>) {
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createDeal(supabase: SupabaseClient, input: Record<string, unknown>) {
  // A lead is optional — a deal can exist without a prior CRM lead (e.g. deals predating the portal).
  return ins(supabase, "deals", pick(input, DEAL_FIELDS));
}
export async function updateDeal(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return upd(supabase, "deals", id, pick(input, DEAL_FIELDS));
}

export async function createAccount(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.holder_name as string)?.trim()) throw new Error("Holder name is required");
  return ins(supabase, "receiving_accounts", pick(input, ACCOUNT_FIELDS));
}
export async function updateAccount(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return upd(supabase, "receiving_accounts", id, pick(input, ACCOUNT_FIELDS));
}

/**
 * Replace a deal's developer/closer assignments with the given list (admin/super only via RLS).
 * `assignments` = [{ developer_id, role }] where role ∈ 'developer' | 'closer'. A person can appear
 * as both roles on the same deal. Empties out the set when given [].
 */
export async function setDealDevelopers(
  supabase: SupabaseClient,
  dealId: string,
  assignments: { developer_id: string; role: "developer" | "closer" }[]
) {
  const { error: delErr } = await supabase.from("deal_developers").delete().eq("deal_id", dealId);
  if (delErr) throw new Error(delErr.message);
  const rows = assignments
    .filter((a) => a.developer_id && (a.role === "developer" || a.role === "closer"))
    .map((a) => ({ deal_id: dealId, developer_id: a.developer_id, role: a.role }));
  if (rows.length === 0) return;
  // de-dupe (deal, dev, role) to respect the unique constraint
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = `${r.developer_id}:${r.role}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const { error } = await supabase.from("deal_developers").insert(unique);
  if (error) throw new Error(error.message);
}

export async function createMethod(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.name as string)?.trim()) throw new Error("Name is required");
  return ins(supabase, "payment_methods", pick(input, METHOD_FIELDS));
}
export async function updateMethod(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return upd(supabase, "payment_methods", id, pick(input, METHOD_FIELDS));
}
