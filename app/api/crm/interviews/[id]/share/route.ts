import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { labelize } from "@/lib/crm/constants";
import { formatCrmDatetime, formatCrmDate } from "@/lib/utils";
import { durationMinLabel } from "@/lib/crm/constants";

// Full, Slack-ready details for one interview: time, duration, company/role, job-post URL, budget, the
// associated dev profile (name / email / stack), and the assigned developer (name + primary email).
// Returns both a copy-ready `text` block and the structured `fields` so a popup can render them.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = createClient(); // RLS-scoped
  const { data: iv } = await supabase
    .from("interviews")
    .select(`id, round, round_name, status, outcome, interview_at, duration_min, meeting_link, job_title, job_post_url, participants,
             lead:leads(company, role, budget, profile:dev_profiles(name, email, stack:dev_stacks(name))),
             giver:profiles!interviews_whom_should_give_fkey(full_name, email),
             given:profiles!interviews_given_by_fkey(full_name, email)`)
    .eq("id", params.id)
    .maybeSingle();
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lead: any = iv.lead ?? {};
  const prof: any = lead.profile ?? {};
  const dev: any = (iv as any).giver ?? (iv as any).given ?? {};

  const people = (Array.isArray((iv as any).participants) ? (iv as any).participants : [])
    .map((p: any) => ({ name: String(p?.name ?? "").trim(), note: String(p?.note ?? "").trim() }))
    .filter((p: any) => p.name || p.note);

  const fields = {
    when: iv.interview_at ? formatCrmDatetime(iv.interview_at) : null,
    duration: iv.duration_min ? durationMinLabel(iv.duration_min) : null,
    round: iv.round ?? null,
    roundName: (iv as any).round_name ?? null,
    people,
    status: labelize(iv.status),
    outcome: iv.outcome ? labelize(iv.outcome) : null,
    company: lead.company ?? iv.job_title ?? null,
    role: lead.role ?? iv.job_title ?? null,
    jobPostUrl: iv.job_post_url ?? lead.job_post_url ?? null,
    budget: lead.budget ?? null,
    meetingLink: iv.meeting_link ?? null,
    profileName: prof.name ?? null,
    profileEmail: prof.email ?? null,
    profileStack: prof.stack?.name ?? null,
    developerName: dev.full_name ?? null,
    developerEmail: dev.email ?? null,
  };

  // Copy-ready text. Every requested line is present; an empty value still prints a blank so the shape
  // is consistent when pasted into Slack.
  const L = (label: string, val: unknown) => `${label}: ${val ?? ""}`;
  const peopleText = people.length
    ? people.map((p: any) => (p.note ? `${p.name} (${p.note})` : p.name)).join(", ")
    : null;
  const text = [
    `Interview — ${fields.company ?? "—"}`,
    L("Date & time", fields.when),
    L("Duration", fields.duration),
    L("Round", fields.roundName ? `${fields.roundName}${fields.round ? ` (${fields.round})` : ""}` : fields.round),
    L("Status", fields.outcome ? `${fields.status} · ${fields.outcome}` : fields.status),
    L("Company", fields.company),
    L("Job designation", fields.role),
    L("Job post URL", fields.jobPostUrl),
    L("Budget", fields.budget),
    L("Profile", fields.profileName),
    L("Profile email", fields.profileEmail),
    L("Profile stack", fields.profileStack),
    L("Developer (should give)", fields.developerName),
    L("Developer email", fields.developerEmail),
    L("Meeting link", fields.meetingLink),
    L(`People on the call (${people.length})`, peopleText),
  ].join("\n");

  return NextResponse.json({ text, fields });
}
