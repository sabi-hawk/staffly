// Lead contact-details service — the client company's representatives logged against a lead (HR /
// recruiter / admin / hiring manager / other). Owner-scoped by RLS on lead_contacts. Injected-client
// pattern like the other lib/services/* modules.
import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTACT_TYPES = ["hr", "recruiter", "company_admin", "hiring_manager", "other"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export interface LeadContactInput {
  contact_type?: string;
  other_type?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  note?: string | null;
}

const cap = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) || null : null);

// Store only http(s) URLs so a `javascript:`/`data:` URL can never be persisted and later rendered as
// a live link (defense in depth alongside the client-side render guard).
function safeUrl(v: unknown, n: number): string | null {
  const s = cap(v, n);
  if (!s) return null;
  try {
    return ["http:", "https:"].includes(new URL(s).protocol) ? s : null;
  } catch {
    return null;
  }
}

function clean(input: LeadContactInput) {
  const type = CONTACT_TYPES.includes(input.contact_type as ContactType) ? (input.contact_type as ContactType) : "hr";
  const row: Record<string, unknown> = {
    contact_type: type,
    other_type: type === "other" ? cap(input.other_type, 80) : null,
    name: cap(input.name, 120),
    email: cap(input.email, 200),
    phone: cap(input.phone, 60),
    linkedin_url: safeUrl(input.linkedin_url, 300),
    note: cap(input.note, 500),
  };
  return row;
}

/** At least one way to reach the contact (or a name) must be present — no empty rows. */
function assertHasSomething(row: Record<string, unknown>) {
  if (!row.name && !row.email && !row.phone && !row.linkedin_url) {
    throw new Error("Add at least a name, email, phone, or LinkedIn URL.");
  }
}

export async function createLeadContact(supabase: SupabaseClient, leadId: string, input: LeadContactInput, actorId: string) {
  const row = clean(input);
  assertHasSomething(row);
  const { data, error } = await supabase
    .from("lead_contacts")
    .insert({ ...row, lead_id: leadId, created_by: actorId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateLeadContact(supabase: SupabaseClient, id: string, input: LeadContactInput) {
  const row = clean(input);
  assertHasSomething(row);
  const { data, error } = await supabase.from("lead_contacts").update(row).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Not found");
}

export async function deleteLeadContact(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("lead_contacts").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Not found");
}
