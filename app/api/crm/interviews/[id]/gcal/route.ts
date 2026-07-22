import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { CRM_DOCS_BUCKET } from "@/lib/crm/docs";
import { googleCalendarEventUrl } from "@/lib/crm/gcal";
import { formatCrmDate } from "@/lib/utils";

// Build a one-click "Add to Google Calendar" URL for a scheduled interview: title, the interview time
// in Pakistan time, the assigned developer as a guest (their primary email), the meeting link as the
// location, and the lead's documents as time-limited links in the description. Read access is enforced
// by RLS on the interview; the service role is used only to sign the document downloads.
const DOC_LINK_TTL = 60 * 60 * 24 * 14; // 14 days — long enough for an upcoming interview

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = createClient(); // RLS: the caller only reads interviews they may see
  const { data: iv } = await supabase
    .from("interviews")
    .select("id, interview_at, duration_min, round, notes, notes2, meeting_link, given_by, whom_should_give, lead:leads(id, company, role)")
    .eq("id", params.id)
    .maybeSingle();
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!iv.interview_at) return NextResponse.json({ error: "This interview has no time set yet." }, { status: 400 });

  const lead: any = iv.lead;

  // Guest = the developer assigned to this call: "whom should give" (the calendar's Developer), else the
  // one who gave it. Use their PRIMARY email (email_secondary can be blank).
  const devId = (iv.whom_should_give as string) || (iv.given_by as string) || null;
  let devEmail: string | null = null;
  let devName: string | null = null;
  if (devId) {
    const { data: dev } = await supabase.from("profiles").select("full_name, email").eq("id", devId).maybeSingle();
    devEmail = dev?.email ?? null;
    devName = dev?.full_name ?? null;
  }

  // Lead documents → time-limited signed links (private bucket; guests can't hit our authed routes).
  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("lead_documents")
    .select("label, file_name, file_path, doc_type")
    .eq("lead_id", lead?.id)
    .order("created_at", { ascending: false });
  const docLines: string[] = [];
  for (const d of (docs ?? []) as any[]) {
    const { data: signed } = await admin.storage.from(CRM_DOCS_BUCKET).createSignedUrl(d.file_path, DOC_LINK_TTL);
    if (signed?.signedUrl) {
      const name = d.label || d.file_name || (d.doc_type === "resume" ? "Resume" : "Document");
      docLines.push(`• ${name}: ${signed.signedUrl}`);
    }
  }

  const roundLabel = iv.round ? `${iv.round} round` : "Interview";
  const title = `Interview · ${lead?.company ?? "Lead"}${lead?.role ? ` · ${lead.role}` : ""}${iv.round ? ` (${iv.round})` : ""}`;

  const detailLines = [
    `${roundLabel}${devName ? ` with ${devName}` : ""}.`,
    lead?.role ? `Role: ${lead.role}` : "",
    `Scheduled: ${formatCrmDate(iv.interview_at)} (Pakistan time)`,
    iv.notes ? `\nNotes: ${iv.notes}` : "",
    iv.notes2 ? `Notes 2: ${iv.notes2}` : "",
    docLines.length ? `\nLead documents (links expire in 14 days):\n${docLines.join("\n")}` : "",
    `\nAdded from the Softonoma CRM.`,
  ].filter(Boolean);

  const url = googleCalendarEventUrl({
    title,
    startISO: iv.interview_at as string,
    durationMin: (iv.duration_min as number) || 60,
    guests: [devEmail],
    location: iv.meeting_link,
    details: detailLines.join("\n"),
  });

  return NextResponse.json({ url, guest: devEmail, docCount: docLines.length });
}
