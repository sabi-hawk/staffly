// Client-side upload guards. Uploads go through a Next.js route (a Vercel serverless function), which
// has a hard ~4.5 MB request-body limit — an oversized file is rejected by the PLATFORM with a 413
// before our code runs, so the response is a plain-text Vercel error (not our JSON). We check the size
// up front and give a clear message, and treat a 413 as "too large" rather than a generic failure.
export const MAX_UPLOAD_MB = 4;
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Returns a friendly error string if the file is too large, else null. */
export function fileTooLargeMessage(file: File): string | null {
  if (file.size <= MAX_BYTES) return null;
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  return `"${file.name}" is ${mb} MB, over the ${MAX_UPLOAD_MB} MB limit. Please upload a smaller file (e.g. compress the PDF).`;
}

/** The message to show when the server/platform rejects an upload as too large (HTTP 413). */
export const PAYLOAD_TOO_LARGE_MESSAGE = `That file is too large to upload (over ${MAX_UPLOAD_MB} MB). Please upload a smaller file.`;

/** Resolve an upload response into a user-facing error message (handles the non-JSON 413 case). */
export async function uploadErrorMessage(res: Response): Promise<string> {
  if (res.status === 413) return PAYLOAD_TOO_LARGE_MESSAGE;
  const json = await res.json().catch(() => ({}));
  return (json as { error?: string }).error ?? "Upload failed";
}
