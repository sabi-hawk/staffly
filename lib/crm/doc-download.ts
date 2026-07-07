// Server-only helper: stream a crm-docs object through our origin so the SAVED filename matches
// what the user sees in the UI. Redirecting to a signed storage URL loses the filename (the browser
// falls back to the random object path), which is why downloads came out with a different name.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRM_DOCS_BUCKET } from "@/lib/crm/docs";

/** A safe download filename from the preferred label, keeping the real extension. */
export function safeDownloadName(preferred: string | null, fileName: string | null): string {
  const ext = (fileName?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  const base = (preferred?.trim() || fileName?.replace(/\.[a-z0-9]+$/i, "") || "document")
    .replace(/[\\/:*?"<>|]+/g, " ") // strip filesystem-illegal chars
    .replace(/\s+/g, " ")
    .trim();
  return ext ? `${base}.${ext}` : base;
}

/** Stream a crm-docs object with a Content-Disposition filename that matches the UI. */
export async function streamCrmDownload(filePath: string, name: string) {
  const { data: blob, error } = await createAdminClient().storage.from(CRM_DOCS_BUCKET).download(filePath);
  if (error || !blob) return NextResponse.json({ error: error?.message ?? "Download failed" }, { status: 400 });
  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      // filename* (RFC 5987) carries unicode/spaces; the plain filename is the ASCII fallback.
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
