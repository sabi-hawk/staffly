// CRM Profiles service — business logic reused by route handlers.
// Every function takes the Supabase client as its first arg (RLS-enforced unless an admin client
// is explicitly passed). Follows the lib/services/* injected-client convention.
import type { SupabaseClient } from "@supabase/supabase-js";

// Canonical home is lib/crm/docs.ts; re-exported here for existing importers (back-compat).
export { CRM_DOCS_BUCKET, DOC_MIME, DOC_MAX_BYTES } from "@/lib/crm/docs";

export interface DevProfileInput {
  name?: string;
  stack_id?: string | null;
  owner_bd_id?: string | null;
  email?: string | null;
  mobile?: string | null;
  dob?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
}

const FIELDS: (keyof DevProfileInput)[] = [
  "name", "stack_id", "owner_bd_id", "email", "mobile", "dob", "status", "notes",
];

function clean(input: DevProfileInput) {
  const row: Record<string, unknown> = {};
  for (const k of FIELDS) {
    if (input[k] === undefined) continue;
    const v = input[k];
    row[k] = v === "" ? null : v;
  }
  return row;
}

export async function createDevProfile(supabase: SupabaseClient, input: DevProfileInput) {
  if (!input.name?.trim()) throw new Error("Name is required");
  const { data, error } = await supabase
    .from("dev_profiles")
    .insert(clean(input))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateDevProfile(supabase: SupabaseClient, id: string, input: DevProfileInput) {
  const row = clean(input);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("dev_profiles").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Set/clear the account password (admin/super-admin only — RLS enforces on dev_profile_secrets). */
export async function setDevProfilePassword(
  supabase: SupabaseClient,
  devProfileId: string,
  password: string | null,
  actorId: string
) {
  const { error } = await supabase
    .from("dev_profile_secrets")
    .upsert(
      { dev_profile_id: devProfileId, account_password: password || null, updated_by: actorId, updated_at: new Date().toISOString() },
      { onConflict: "dev_profile_id" }
    );
  if (error) throw new Error(error.message);
}

/** Insert a document row; if it's a primary resume, unset any existing primary first. */
export async function addDevProfileDocument(
  supabase: SupabaseClient,
  doc: {
    dev_profile_id: string;
    doc_type: "resume" | "cover_letter";
    label?: string | null;
    is_primary?: boolean;
    file_path: string;
    file_name?: string | null;
    uploaded_by: string;
  }
) {
  if (doc.doc_type === "resume" && doc.is_primary) {
    await supabase
      .from("dev_profile_documents")
      .update({ is_primary: false })
      .eq("dev_profile_id", doc.dev_profile_id)
      .eq("doc_type", "resume");
  }
  const { error } = await supabase.from("dev_profile_documents").insert({
    dev_profile_id: doc.dev_profile_id,
    doc_type: doc.doc_type,
    label: doc.label ?? null,
    is_primary: doc.doc_type === "resume" ? !!doc.is_primary : false,
    file_path: doc.file_path,
    file_name: doc.file_name ?? null,
    uploaded_by: doc.uploaded_by,
  });
  if (error) throw new Error(error.message);
}
