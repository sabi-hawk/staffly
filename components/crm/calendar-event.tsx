"use client";
// A single interview chip on the CRM calendar. Coloured by the owning BD. Clicking opens a details
// popover — but only when `can_expand` (the caller owns it, or is admin/super); otherwise other BDs
// just see time + stack + colour (no company/details).
import { useState } from "react";
import { X } from "lucide-react";
import { bdColor } from "@/lib/crm/bd-color";

export type CalEvent = {
  id: string; interview_at: string; round: string | null; status: string | null; outcome: string | null;
  owner_bd_id: string | null; owner_name: string | null; stack: string | null;
  company: string | null; job_title: string | null; developer: string | null; can_expand: boolean; is_mine: boolean;
};

const time = (t: string) => new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

export function CalendarEvent({ ev }: { ev: CalEvent }) {
  const [open, setOpen] = useState(false);
  const c = bdColor(ev.owner_bd_id);
  const label = `${time(ev.interview_at)} · ${ev.stack ?? "—"}`;

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
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">When</dt><dd>{new Date(ev.interview_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}</dd></div>
              {ev.company && <div className="flex justify-between gap-3"><dt className="text-text-secondary">Company</dt><dd>{ev.company}</dd></div>}
              {ev.job_title && <div className="flex justify-between gap-3"><dt className="text-text-secondary">Role</dt><dd className="text-right">{ev.job_title}</dd></div>}
              {ev.stack && <div className="flex justify-between gap-3"><dt className="text-text-secondary">Stack</dt><dd>{ev.stack}</dd></div>}
              {ev.round && <div className="flex justify-between gap-3"><dt className="text-text-secondary">Round</dt><dd>{ev.round}</dd></div>}
              {ev.developer && <div className="flex justify-between gap-3"><dt className="text-text-secondary">Developer</dt><dd>{ev.developer}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">BD</dt><dd style={{ color: c.text }}>{ev.owner_name ?? "—"}</dd></div>
            </dl>
            <a href={`/crm/leads?tab=interviews`} className="mt-3 inline-block text-caption text-brand-primary hover:underline">Open in interviews →</a>
          </div>
        </div>
      )}
    </>
  );
}
