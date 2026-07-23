"use client";
// A single interview chip on the CRM calendar. Coloured by the owning BD. Clicking opens a details
// popover — but only when `can_expand` (the caller owns it, or is admin/super); otherwise other BDs
// just see time + stack + colour (no company/details). The popover loads full details (profile email/
// stack, developer + email, job-post URL, budget) so they can be copied for Slack.
import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { bdColor } from "@/lib/crm/bd-color";
import { GoogleCalendarButton } from "@/components/crm/gcal-button";
import { CopyInterview } from "@/components/crm/copy-interview";

export type CalEvent = {
  id: string; interview_at: string; round: string | null; status: string | null; outcome: string | null;
  owner_bd_id: string | null; owner_name: string | null; stack: string | null; profile_label: string | null;
  company: string | null; job_title: string | null; developer: string | null; can_expand: boolean; is_mine: boolean;
};

type Fields = {
  when: string | null; duration: string | null; round: string | null; roundName: string | null; status: string | null; outcome: string | null;
  company: string | null; role: string | null; jobPostUrl: string | null; budget: string | null; meetingLink: string | null;
  profileName: string | null; profileEmail: string | null; profileStack: string | null;
  developerName: string | null; developerEmail: string | null;
  people?: { name: string; note: string }[];
};

const time = (t: string) => new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
const isUrl = (s?: string | null) => !!s && /^https?:\/\//i.test(s);

function DRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-right">
        {href && isUrl(href) ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">{value} <ExternalLink className="size-3 shrink-0" /></a> : value}
      </dd>
    </div>
  );
}

export function CalendarEvent({ ev }: { ev: CalEvent }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Fields | null>(null);
  const c = bdColor(ev.owner_bd_id);
  const label = `${time(ev.interview_at)} · ${ev.stack ?? "—"}`;

  useEffect(() => {
    if (!open || f) return;
    fetch(`/api/crm/interviews/${ev.id}/share`).then((r) => r.json()).then((j) => setF(j.fields ?? null)).catch(() => {});
  }, [open, f, ev.id]);

  return (
    <>
      <button
        onClick={() => ev.can_expand && setOpen(true)}
        title={ev.can_expand ? "View details" : `${ev.owner_name ?? "BD"}'s interview (private)`}
        className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
        style={{ backgroundColor: c.bg, color: c.text, borderLeft: `3px solid ${c.border}`, cursor: ev.can_expand ? "pointer" : "default" }}
      >
        {label}{ev.round ? ` · ${ev.round}` : ""}
      </button>

      {open && ev.can_expand && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Interview</h3>
              <div className="flex items-center gap-1">
                <CopyInterview interviewId={ev.id} />
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
              </div>
            </div>
            <dl className="max-h-[60vh] space-y-1.5 overflow-y-auto text-sm">
              <DRow label="When" value={f?.when ?? new Date(ev.interview_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })} />
              <DRow label="Duration" value={f?.duration} />
              <DRow label="Company" value={f?.company ?? ev.company} />
              <DRow label="Job designation" value={f?.role ?? ev.job_title} />
              <DRow label="Job post" value={f?.jobPostUrl ? f.jobPostUrl.replace(/^https?:\/\//, "") : null} href={f?.jobPostUrl} />
              <DRow label="Budget" value={f?.budget} />
              <DRow label="Profile" value={f?.profileName ?? ev.profile_label} />
              <DRow label="Profile email" value={f?.profileEmail} />
              <DRow label="Stack" value={f?.profileStack ?? ev.stack} />
              <DRow label="Round" value={f?.roundName ? `${f.roundName}${f.round ? ` (${f.round})` : ""}` : (f?.round ?? ev.round)} />
              <DRow label="Developer" value={f?.developerName ?? ev.developer} />
              <DRow label="Developer email" value={f?.developerEmail} />
              <DRow label="Meeting link" value={f?.meetingLink ? "Join" : null} href={f?.meetingLink} />
              {(f?.people?.length ?? 0) > 0 && <DRow label={`People (${f!.people!.length})`} value={f!.people!.map((x) => (x.note ? `${x.name} (${x.note})` : x.name)).join(", ")} />}
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">BD</dt><dd style={{ color: c.text }}>{ev.owner_name ?? "—"}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <GoogleCalendarButton interviewId={ev.id} variant="link" />
              <a href={`/crm/leads?tab=interviews`} className="text-caption text-brand-primary hover:underline">Open in interviews →</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
