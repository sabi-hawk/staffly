// CRM Profiles service — business logic reused by route handlers.
// Every function takes the Supabase client as its first arg (RLS-enforced unless an admin client
// is explicitly passed). Follows the lib/services/* injected-client convention.
import type { SupabaseClient } from "@supabase/supabase-js";

// Canonical home is lib/crm/docs.ts; re-exported here for existing importers (back-compat).
export { CRM_DOCS_BUCKET, DOC_MIME, DOC_MAX_BYTES } from "@/lib/crm/docs";

export interface DevProfileInput {
  name?: string;
  stack_id?: string | null;
  stack?: string | null; // typed/selected stack NAME (resolved to stack_id, find-or-create)
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

/**
 * Resolve a free-text stack NAME to a `stack_id` — find the existing dev_stack (case-insensitive) or
 * create it (admin-writable lookup). Mutates `input`: sets `stack_id`, removes `stack`. No-op if the
 * caller didn't send `stack` (leaves any explicit stack_id untouched).
 */
async function resolveStack(supabase: SupabaseClient, input: DevProfileInput) {
  if (input.stack === undefined) return;
  const name = (input.stack ?? "").trim();
  delete input.stack; // not in FIELDS — clean() ignores it anyway; dropped here too, defensively
  if (!name) { input.stack_id = null; return; }
  // escape ilike wildcards so a name with % or _ is matched LITERALLY (case-insensitive exact find),
  // not as a pattern — otherwise "Node_JS" would match "NodeXJS" and reuse the wrong stack.
  const pattern = name.replace(/[%_\\]/g, (ch) => `\\${ch}`);
  const findByName = () => supabase.from("dev_stacks").select("id").ilike("name", pattern).limit(1).maybeSingle();

  const found = await findByName();
  if (found.data?.id) { input.stack_id = found.data.id; return; }

  const max = await supabase.from("dev_stacks").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const ins = await supabase
    .from("dev_stacks")
    .insert({ name, sort_order: (max.data?.sort_order ?? 0) + 1, is_active: true })
    .select("id")
    .single();
  if (!ins.error) { input.stack_id = ins.data.id; return; }
  // unique-name race (another insert won) — re-select the winner.
  const re = await findByName();
  if (re.data?.id) { input.stack_id = re.data.id; return; }
  throw new Error(`Could not resolve stack "${name}" — please retry.`);
}

export async function createDevProfile(supabase: SupabaseClient, input: DevProfileInput) {
  if (!input.name?.trim()) throw new Error("Name is required");
  await resolveStack(supabase, input);
  const { data, error } = await supabase
    .from("dev_profiles")
    .insert(clean(input))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateDevProfile(supabase: SupabaseClient, id: string, input: DevProfileInput) {
  await resolveStack(supabase, input);
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
    note?: string | null;
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
      .eq("doc_type", "resume")
      .is("deleted_at", null);
  }
  const { data, error } = await supabase.from("dev_profile_documents").insert({
    dev_profile_id: doc.dev_profile_id,
    doc_type: doc.doc_type,
    label: doc.label ?? null,
    note: doc.note ?? null,
    is_primary: doc.doc_type === "resume" ? !!doc.is_primary : false,
    file_path: doc.file_path,
    file_name: doc.file_name ?? null,
    uploaded_by: doc.uploaded_by,
  }).select("id, doc_type, label, note, is_primary, file_name, created_at").single();
  if (error) throw new Error(error.message);
  return data;
}

/** Make a resume the primary one (owner/admin via RLS): unset siblings, then set this. */
export async function setPrimaryDocument(supabase: SupabaseClient, docId: string) {
  const { data: doc } = await supabase.from("dev_profile_documents").select("dev_profile_id, doc_type, deleted_at").eq("id", docId).single();
  if (!doc) throw new Error("Not found");
  if (doc.deleted_at) throw new Error("Cannot set a deleted document as primary");
  if (doc.doc_type !== "resume") throw new Error("Only resumes can be primary");
  const unset = await supabase.from("dev_profile_documents").update({ is_primary: false })
    .eq("dev_profile_id", doc.dev_profile_id).eq("doc_type", "resume").is("deleted_at", null);
  if (unset.error) throw new Error(unset.error.message);
  const { data, error } = await supabase.from("dev_profile_documents").update({ is_primary: true }).eq("id", docId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Not found"); // RLS filtered it out (not the caller's profile)
}

/** Set a document's purpose note (max 500 chars). */
export async function setDocumentNote(supabase: SupabaseClient, docId: string, note: string | null) {
  const clean = note ? note.slice(0, 500) : null;
  const { data, error } = await supabase.from("dev_profile_documents").update({ note: clean }).eq("id", docId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Not found");
}

/**
 * Soft-delete a document (owning BD, BD-Lead, or admin): hidden from the profile, retained + shown in
 * the admin-only history. Routed through a security-definer RPC (0024) because after 0023 the owner's
 * own UPDATE that sets `deleted_at` is rejected — the post-update row is no longer selectable by the
 * owner. The function authorizes via `can_manage_dev_docs` and stamps `deleted_by = auth.uid()`.
 */
export async function softDeleteDocument(supabase: SupabaseClient, docId: string) {
  const { error } = await supabase.rpc("crm_soft_delete_document", { p_doc_id: docId });
  if (error) throw new Error(error.message);
}
