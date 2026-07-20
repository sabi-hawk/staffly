"use client";
// Per-day task summary control for an attendance row. Shows the current state and opens a rich-text
// editor (same editor as the lead notes). Rules mirror the service: edit freely the same day; a past
// day with a summary is locked (view only); a past day still missing can be added LATE (flagged).
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Eye, X, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/crm/rich-text";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";
const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export function DailySummary({
  workDate, today, html, late,
}: {
  workDate: string;
  today: string;
  html: string | null;
  late: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(html ?? "");
  // Wrap the post-save refetch in a transition so it's a smooth internal refresh (not an abrupt whole-page
  // re-render) and the button stays "Saving…" until the fresh data lands.
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!pending) setBusy(false); }, [pending]);

  const present = !!strip(html);
  const isToday = workDate === today;
  const editable = isToday || (!present && workDate < today); // today = free; past+missing = late add
  const locked = present && !isToday;
  const lateAdd = !present && workDate < today;

  async function save() {
    if (!strip(draft)) return toast.error("Please write a short summary first.");
    setBusy(true);
    const res = await fetch("/api/attendance/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ work_date: workDate, html: draft }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return toast.error(j.error ?? "Failed to save"); }
    toast.success(j.late ? "Summary saved (added late)" : "Summary saved");
    setOpen(false);
    startTransition(() => router.refresh()); // busy stays on until the refetch lands (cleared by the effect)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {present ? (
          <>
            <span className="max-w-[220px] truncate text-text-secondary">{strip(html)}</span>
            {late && <Badge tone="warning">late</Badge>}
            <Button variant="outline" size="sm" onClick={() => { setDraft(html ?? ""); setOpen(true); }} aria-label={locked ? "View summary" : "Edit summary"}>
              {locked ? <><Eye className="size-4" /></> : <><Pencil className="size-4" /></>}
            </Button>
          </>
        ) : editable ? (
          <Button variant="outline" size="sm" className="text-warning" onClick={() => { setDraft(""); setOpen(true); }}>
            <Plus className="size-4" /> {lateAdd ? "Add (late)" : "Add summary"}
          </Button>
        ) : (
          // Past day, missing, and not editable shouldn't happen (past+missing is always late-addable),
          // but guard: show a subtle "missing".
          <span className="inline-flex items-center gap-1 text-caption text-text-secondary"><AlertTriangle className="size-3.5" /> missing</span>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-h3 font-semibold text-text-primary">Task summary · {workDate}</h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
            </div>
            {locked ? (
              <>
                <p className="mb-3 inline-flex items-center gap-1 text-caption text-text-secondary"><Lock className="size-3.5" /> This day has passed, so the summary is locked.{late && " (added late)"}</p>
                <div className={`rounded-md border border-border p-3 text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: html as string }} />
              </>
            ) : (
              <>
                <p className="mb-3 text-caption text-text-secondary">
                  A couple of lines on what you did today. You can format text and paste links.
                  {lateAdd && <span className="text-warning"> This is a late entry (the day has passed) and will be flagged.</span>}
                </p>
                <RichText value={draft} onChange={setDraft} placeholder="e.g. Closed 2 BD leads, prepped the DemoCorp assessment…" />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={save} disabled={busy || pending}>{busy || pending ? "Saving…" : "Save summary"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy || pending}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
