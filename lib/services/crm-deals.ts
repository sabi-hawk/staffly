// CRM Deals service (admin/super-admin only — RLS enforces). Injected Supabase client.
import type { SupabaseClient } from "@supabase/supabase-js";

function pick(input: Record<string, unknown>, fields: string[]) {
  const row: Record<string, unknown> = {};
  for (const k of fields) {
    if (input[k] === undefined) continue;
    row[k] = input[k] === "" ? null : input[k];
  }
  return row;
}

const DEAL_FIELDS = [
  "lead_id", "designation", "joining_date", "dev_profile_id", "working_developer", "salary",
  "receiving_account_id", "payment_method_id", "profile_dob", "status",
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

export async function createMethod(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.name as string)?.trim()) throw new Error("Name is required");
  return ins(supabase, "payment_methods", pick(input, METHOD_FIELDS));
}
export async function updateMethod(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return upd(supabase, "payment_methods", id, pick(input, METHOD_FIELDS));
}
