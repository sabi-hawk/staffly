import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/crm/docs";
import { googleCalendarEventUrl } from "@/lib/crm/gcal";
import { calendarApiEnabled } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/tokens";
import { createCalendarEventWithAttachments, type UploadDoc } from "@/lib/google/calendar";
import { formatCrmDate } from "@/lib/utils";

// Interview → Google Calendar. Two paths behind ONE endpoint:
//   GET  → returns the one-click TEMPLATE URL (docs as time-limited signed links). Always available.
//   POST → if the API is enabled AND the BD has connected Google, create the event via the Calendar API
//          with the documents uploaded to Drive and ATTACHED; otherwise fall back to the one-click URL.
const DOC_LINK_TTL = 60 * 60 * 24 * 14; // 14 days
const isProblem = (x: unknown): x is NextResponse => x instanceof NextResponse;

type Ctx = { iv: any; lead: any; devEmail: string | null; devName: string | null };

// Load the interview (RLS-scoped) + its lead + the assigned developer's email. Returns a NextResponse on
// any problem so the caller can early-return it.
async function loadCtx(id: string): Promise<Ctx | NextResponse> {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = createClient(); // RLS: the caller only reads interviews they may see
  const { data: iv } = await supabase
    .from("interviews")
    .select("id, interview_at, duration_min, round, round_name, participants, notes, notes2, meeting_link, given_by, whom_should_give, lead:leads(id, company, role)")
    .eq("id", id)
    .maybeSingle();
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!iv.interview_at) return NextResponse.json({ error: "This interview has no time set yet." }, { status: 400 });

  // Guest = the developer assigned to this call: "whom should give" (the calendar's Developer), else the
  // one who gave it. Use their PRIMARY email (email_secondary can be blank).
  const devId = (iv.whom_should_give as string) || (iv.given_by as string) || null;
  let devEmail: string | null = null, devName: string | null = null;
  if (devId) {
    const { data: dev } = await supabase.from("profiles").select("full_name, email").eq("id", devId).maybeSingle();
    devEmail = dev?.email ?? null;
    devName = dev?.full_name ?? null;
  }
  return { iv, lead: iv.lead, devEmail, devName };
}

// Prefer the semantic round name ("Initial call", "Technical round 1") over the ordinal for the title.
function roundLabelOf(iv: any): string | null {
  return iv.round_name || (iv.round ? `${iv.round} round` : null);
}
function peopleOf(iv: any): { name: string; note: string }[] {
  return (Array.isArray(iv.participants) ? iv.participants : [])
    .map((p: any) => ({ name: String(p?.name ?? "").trim(), note: String(p?.note ?? "").trim() }))
    .filter((p: any) => p.name || p.note);
}
function title(ctx: Ctx) {
  const { iv, lead } = ctx;
  const rn = roundLabelOf(iv);
  return `Interview · ${lead?.company ?? "Lead"}${rn ? ` · ${rn}` : ""}`;
}
function baseDetails(ctx: Ctx): string[] {
  const { iv, lead, devName } = ctx;
  const people = peopleOf(iv);
  const peopleText = people.map((p) => (p.note ? `${p.name} (${p.note})` : p.name)).join(", ");
  return [
    `${roundLabelOf(iv) ?? "Interview"}${devName ? ` with ${devName}` : ""}.`,
    lead?.role ? `Role: ${lead.role}` : "",
    `Scheduled: ${formatCrmDate(iv.interview_at)} (Pakistan time)`,
    people.length ? `People on the call (${people.length}): ${peopleText}` : "",
    iv.notes ? `\nNotes: ${iv.notes}` : "",
    iv.notes2 ? `Notes 2: ${iv.notes2}` : "",
  ].filter(Boolean);
}

// One-click TEMPLATE URL with the lead's documents as signed links in the description.
async function buildOneClickUrl(ctx: Ctx): Promise<{ url: string; docCount: number }> {
  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("lead_documents").select("label, file_name, file_path, doc_type")
    .eq("lead_id", ctx.lead?.id).order("created_at", { ascending: false });
  const docLines: string[] = [];
  for (const d of (docs ?? []) as any[]) {
    const { data: signed } = await admin.storage.from(CRM_DOCS_BUCKET).createSignedUrl(d.file_path, DOC_LINK_TTL);
    if (signed?.signedUrl) docLines.push(`• ${d.label || d.file_name || "Document"}: ${signed.signedUrl}`);
  }
  const details = [
    ...baseDetails(ctx),
    docLines.length ? `\nLead documents (links expire in 14 days):\n${docLines.join("\n")}` : "",
    `\nAdded from the Softonoma CRM.`,
  ].filter(Boolean);
  const url = googleCalendarEventUrl({
    title: title(ctx), startISO: ctx.iv.interview_at, durationMin: ctx.iv.duration_min || 60,
    guests: [ctx.devEmail], location: ctx.iv.meeting_link, details: details.join("\n"),
  });
  return { url, docCount: docLines.length };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadCtx(params.id);
  if (isProblem(ctx)) return ctx;
  const { url, docCount } = await buildOneClickUrl(ctx);
  return NextResponse.json({ url, guest: ctx.devEmail, docCount });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  const ctx = await loadCtx(params.id);
  if (isProblem(ctx)) return ctx;

  // API path only when the flag is on AND this BD has connected Google (has a usable token).
  const token = me && calendarApiEnabled() ? await getValidAccessToken(me.id) : null;
  if (!token) {
    const { url, docCount } = await buildOneClickUrl(ctx);
    return NextResponse.json({ api: false, url, docCount, needsConnect: calendarApiEnabled() });
  }

  // Download each lead document's bytes to upload to the BD's Drive and attach.
  const admin = createAdminClient();
  const { data: docRows } = await admin
    .from("lead_documents").select("label, file_name, file_path, doc_type")
    .eq("lead_id", ctx.lead?.id).order("created_at", { ascending: false });
  const docs: UploadDoc[] = [];
  for (const d of (docRows ?? []) as any[]) {
    const { data: blob } = await admin.storage.from(CRM_DOCS_BUCKET).download(d.file_path);
    if (!blob) continue;
    docs.push({
      name: d.file_name || d.label || "document",
      mimeType: blob.type || "application/octet-stream",
      bytes: Buffer.from(await blob.arrayBuffer()),
    });
  }

  try {
    const { htmlLink, attached } = await createCalendarEventWithAttachments({
      accessToken: token,
      summary: title(ctx),
      description: [...baseDetails(ctx), docs.length ? `\n${docs.length} document${docs.length === 1 ? "" : "s"} attached to this event.` : "", `\nCreated from the Softonoma CRM.`].filter(Boolean).join("\n"),
      startISO: ctx.iv.interview_at,
      durationMin: ctx.iv.duration_min || 60,
      attendees: [ctx.devEmail ?? ""],
      location: ctx.iv.meeting_link,
      docs,
    });
    return NextResponse.json({ api: true, htmlLink, attached, guest: ctx.devEmail });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
