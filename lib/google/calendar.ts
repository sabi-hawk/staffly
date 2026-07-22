// Google Calendar + Drive API calls (fetch-based, no SDK). Given a BD's access token, upload documents
// to their Drive and create a Calendar event that ATTACHES those files (not just links). Server-only.
import { randomUUID } from "crypto";

const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink";
const DRIVE_PERMS = (id: string) => `https://www.googleapis.com/drive/v3/files/${id}/permissions`;
const CAL_INSERT = "https://www.googleapis.com/calendar/v3/calendars/primary/events?supportsAttachments=true&sendUpdates=all";

export type UploadDoc = { name: string; mimeType: string; bytes: Buffer };
type DriveFile = { id: string; name: string; mimeType: string; webViewLink: string };

// Upload one file to the user's Drive (drive.file scope → the app can create/manage this file), then
// grant "anyone with the link" read so the event's guests can open the attachment.
async function driveUpload(accessToken: string, doc: UploadDoc): Promise<DriveFile> {
  const boundary = `softonoma-${randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: doc.name })}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${doc.mimeType}\r\n\r\n`),
    doc.bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(DRIVE_UPLOAD, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  const file = (await res.json()) as DriveFile;

  // Make it viewable by anyone with the link (same exposure as the previous signed links).
  await fetch(DRIVE_PERMS(file.id), {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  return file;
}

export type CreateEventInput = {
  accessToken: string;
  summary: string;
  description: string;
  startISO: string;   // stored UTC instant
  durationMin: number;
  timeZone?: string;  // default Asia/Karachi
  attendees: string[];
  location?: string | null;
  docs: UploadDoc[];
};

// Upload every doc to Drive, then insert a Calendar event with those files attached + the guest invited.
export async function createCalendarEventWithAttachments(input: CreateEventInput): Promise<{ htmlLink: string; attached: number }> {
  const attachments: { fileUrl: string; title: string; mimeType: string; fileId: string }[] = [];
  for (const doc of input.docs) {
    const f = await driveUpload(input.accessToken, doc);
    attachments.push({ fileUrl: f.webViewLink, title: f.name, mimeType: f.mimeType, fileId: f.id });
  }

  const start = new Date(input.startISO);
  const end = new Date(start.getTime() + (input.durationMin || 60) * 60_000);
  const tz = input.timeZone ?? "Asia/Karachi";
  const event = {
    summary: input.summary,
    description: input.description,
    ...(input.location ? { location: input.location } : {}),
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
    attendees: Array.from(new Set(input.attendees.filter((e) => e && e.includes("@")))).map((email) => ({ email })),
    ...(attachments.length ? { attachments } : {}),
  };

  const res = await fetch(CAL_INSERT, {
    method: "POST",
    headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Calendar insert failed (${res.status}): ${await res.text()}`);
  const j = (await res.json()) as { htmlLink: string };
  return { htmlLink: j.htmlLink, attached: attachments.length };
}
