// CRM Leads / Interviews / Assessments service. Injected Supabase client (RLS-enforced).
import type { SupabaseClient } from "@supabase/supabase-js";
import { DISQUALIFY_CATEGORIES } from "@/lib/crm/constants";

function pick<T extends object>(input: T, fields: (keyof T)[]) {
  const row: Record<string, unknown> = {};
  for (const k of fields) {
    if (input[k] === undefined) continue;
    row[k as string] = input[k] === "" ? null : input[k];
  }
  return row;
}

const LEAD_FIELDS = ["company", "role", "dev_profile_id", "owner_bd_id", "status"] as const;
const INTERVIEW_FIELDS = [
  "lead_id", "dev_profile_id", "owner_bd_id", "job_title", "company", "job_post_url", "status",
  "given_by", "whom_should_give", "interview_at", "round", "outcome", "notes", "notes2",
] as const;
const ASSESSMENT_FIELDS = [
  "lead_id", "dev_profile_id", "owner_bd_id", "job_title", "company", "status", "entry_date", "deadline",
  "completion_date", "mail_subject", "job_post_url", "job_description", "completed_by", "priority",
  "budget", "assessment_link", "duration", "notes", "extra",
] as const;

async function insert(supabase: SupabaseClient, table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
async function update(supabase: SupabaseClient, table: string, id: string, row: Record<string, unknown>) {
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Leads ──
export async function createLead(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.company as string)?.trim()) throw new Error("Company is required");
  return insert(supabase, "leads", pick(input as never, LEAD_FIELDS as never));
}
export async function updateLead(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return update(supabase, "leads", id, pick(input as never, LEAD_FIELDS as never));
}
export async function disqualifyLead(
  supabase: SupabaseClient,
  id: string,
  category: string,
  note: string,
  actorId: string
) {
  if (!category || !note?.trim()) throw new Error("A reason category and note are required");
  if (!DISQUALIFY_CATEGORIES.some((c) => c.value === category)) throw new Error("Invalid reason category");
  const { error } = await supabase
    .from("leads")
    .update({
      status: "disqualified",
      disqualified_category: category,
      disqualified_note: note,
      disqualified_by: actorId,
      disqualified_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function requalifyLead(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("leads")
    .update({ status: "open", disqualified_category: null, disqualified_note: null, disqualified_by: null, disqualified_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Interviews ──
export async function createInterview(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.job_title as string)?.trim() && !(input.company as string)?.trim())
    throw new Error("Add a job title or company");
  return insert(supabase, "interviews", pick(input as never, INTERVIEW_FIELDS as never));
}
export async function updateInterview(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return update(supabase, "interviews", id, pick(input as never, INTERVIEW_FIELDS as never));
}

// ── Assessments ──
export async function createAssessment(supabase: SupabaseClient, input: Record<string, unknown>) {
  if (!(input.job_title as string)?.trim() && !(input.company as string)?.trim())
    throw new Error("Add a job title or company");
  return insert(supabase, "assessments", pick(input as never, ASSESSMENT_FIELDS as never));
}
export async function updateAssessment(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  return update(supabase, "assessments", id, pick(input as never, ASSESSMENT_FIELDS as never));
}
