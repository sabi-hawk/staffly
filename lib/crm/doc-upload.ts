// Server-only helpers for CRM document uploads (route handlers). Centralises the validate →
// upload → rollback lifecycle shared by the deal / assessment / dev-profile document routes.
// NOTE: imports the service-role admin client — never import this from a client component.
import { createAdminClient } from "@/lib/supabase/admin";
import { EXT, magicMatches, CRM_DOCS_BUCKET, DOC_MIME, DOC_MAX_BYTES } from "@/lib/crm/docs";

export type UploadError = { status: number; message: string };
const err = (status: number, message: string): { error: UploadError } => ({ error: { status, message } });

/**
 * Read + validate a multipart document upload: presence, MIME allow-list, size cap, and magic-byte
 * match (don't trust the browser Content-Type). Returns the form + file + bytes, or a typed error.
 */
export async function readValidatedDoc(
  req: Request
): Promise<{ error: UploadError } | { form: FormData; file: File; buf: Buffer }> {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return err(400, "No file");
  if (!DOC_MIME.includes(file.type)) return err(400, "Use PDF, DOC/DOCX or an image");
  if (file.size > DOC_MAX_BYTES) return err(400, "Max 10MB");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(file.type, buf)) return err(400, "File content does not match its type");
  return { form, file, buf };
}

/**
 * Upload validated bytes to the private crm-docs bucket under `prefix/<uuid>.<ext>`. Returns the
 * object path plus a `rollback()` that removes the orphaned object if the caller's DB insert fails.
 */
export async function stageCrmDoc(
  prefix: string,
  file: File,
  buf: Buffer
): Promise<{ error: UploadError } | { objectPath: string; rollback: () => Promise<void> }> {
  const objectPath = `${prefix}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(CRM_DOCS_BUCKET)
    .upload(objectPath, buf, { contentType: file.type, upsert: false });
  if (error) return err(400, error.message);
  const rollback = async () => {
    const { error: rmErr } = await admin.storage.from(CRM_DOCS_BUCKET).remove([objectPath]);
    // Best-effort cleanup; surface the orphan so it can be reaped rather than lost silently.
    if (rmErr) console.error(`crm-docs rollback failed for ${objectPath}: ${rmErr.message}`);
  };
  return { objectPath, rollback };
}
