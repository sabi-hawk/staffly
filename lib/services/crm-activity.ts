// CRM Leads / Interviews / Assessments service. Injected Supabase client (RLS-enforced).
import type { SupabaseClient } from "@supabase/supabase-js";
import { DISQUALIFY_CATEGORIES } from "@/lib/crm/constants";
import { sanitizeRichText } from "@/lib/sanitize";

// Sanitize any rich-text fields (job_description, notes) at the write path — stored HTML is then
// always safe to render (leads render these; assessments sanitized defensively even though currently
// shown as plain text).
function sanitizeRichFields(input: Record<string, unknown>) {
  if (input.job_description !== undefined) input.job_description = sanitizeRichText(input.job_description as string);
  if (input.notes !== undefined) input.notes = sanitizeRichText(input.notes as string);
}

function pick<T extends object>(input: T, fields: (keyof T)[]) {
  const row: Record<string, unknown> = {};
  for (const k of fields) {
    if (input[k] === undefined) continue;
    row[k as string] = input[k] === "" ? null : input[k];
  }
  return row;
}

const LEAD_FIELDS = [
  "company", "role", "dev_profile_id", "owner_bd_id", "status", "feedback",
  "budget", "expected_budget", "shift", "job_description", "notes",
] as const;
const INTERVIEW_FIELDS = [
  "lead_id", "dev_profile_id", "owner_bd_id", "job_title", "company", "job_post_url", "status",
  "given_by", "whom_should_give", "interview_at", "received_date", "round", "outcome", "feedback", "notes", "notes2",
] as const;
const ASSESSMENT_FIELDS = [
  "lead_id", "dev_profile_id", "owner_bd_id", "job_title", "company", "status", "entry_date", "deadline",
  "completion_date", "mail_subject", "job_post_url", "job_description", "completed_by", "whom_should_complete",
  "priority", "budget", "assessment_link", "duration", "camera", "category_id", "feedback", "notes", "extra",
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
  sanitizeRichFields(input);
  return insert(supabase, "leads", pick(input as never, LEAD_FIELDS as never));
}
export async function updateLead(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  // FRD-07: rejected/dismissed require a reason. Dismiss has a dedicated action (category+note);
  // a generic status update to rejected/dismissed must carry feedback (blocks a bare-status bypass).
  const status = input.status as string | undefined;
  if ((status === "rejected" || status === "dismissed") && !(input.feedback as string)?.trim()) {
    throw new Error("A rejected or dismissed lead needs a reason — add feedback.");
  }
  sanitizeRichFields(input);
  return update(supabase, "leads", id, pick(input as never, LEAD_FIELDS as never));
}
// Dismiss a lead ("we're not proceeding") with a required reason. Reuses the legacy disqualified_*
// columns for audit continuity (FRD-07 renamed the concept disqualified → dismissed).
export async function dismissLead(
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
      status: "dismissed",
      disqualified_category: category,
      disqualified_note: note,
      disqualified_by: actorId,
      disqualified_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
// Reopen a dismissed lead back to In Progress, clearing the reason.
export async function reopenLead(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("leads")
    .update({ status: "in_progress", disqualified_category: null, disqualified_note: null, disqualified_by: null, disqualified_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
// Back-compat aliases (older callers/tests referenced the disqualify/requalify names).
export const disqualifyLead = dismissLead;
export const requalifyLead = reopenLead;

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
  sanitizeRichFields(input);
  return insert(supabase, "assessments", pick(input as never, ASSESSMENT_FIELDS as never));
}
export async function updateAssessment(supabase: SupabaseClient, id: string, input: Record<string, unknown>) {
  sanitizeRichFields(input);
  return update(supabase, "assessments", id, pick(input as never, ASSESSMENT_FIELDS as never));
}

// ── Dismiss / restore (soft-hide) ──
// A BD may dismiss their own interview/assessment (crossed out, kept for audit). Only a super admin
// can restore (un-dismiss) or hard-delete — the DB trigger crm_guard_undismiss (0049) enforces that a
// non-super can only set dismissed_at (null → now), never clear it, and stamps dismissed_by server-side.
export type ActivityKind = "interviews" | "assessments";

export async function dismissActivity(supabase: SupabaseClient, kind: ActivityKind, id: string, reason?: string) {
  const { error } = await supabase
    .from(kind)
    .update({ dismissed_at: new Date().toISOString(), dismiss_reason: reason?.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreActivity(supabase: SupabaseClient, kind: ActivityKind, id: string) {
  const { error } = await supabase
    .from(kind)
    .update({ dismissed_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
