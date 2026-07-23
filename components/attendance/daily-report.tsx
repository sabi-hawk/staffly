"use client";
// One consolidated end-of-day "Today's summary" for everyone. For a BD (owns ≥1 profile) it captures
// per-profile job-application counts (with a live total) AND free-text Notes for other work (meetings,
// creating/maturing profiles, etc.); for everyone else it's just the Notes. One Save writes both — so a
// BD no longer fills counts up top and a summary down below separately. The text part is "Notes"; the
// whole form is the day's "summary".
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookPen, Pencil, Copy, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { RichText } from "@/components/crm/rich-text";
import { summaryShareText } from "@/lib/summary-share";
import type { ProfileCount } from "@/lib/services/bd-jobs";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";

const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export function DailyReport({
  profiles,
  workDate,
  checkedIn,
  notesHtml,
  huntedToday = 0,
}: {
  profiles: ProfileCount[];
  workDate: string;
  checkedIn: boolean;
  notesHtml: string | null;
  huntedToday?: number; // auto-counted from the shared job board (read-only)
}) {
  const router = useRouter();
  const isBd = profiles.length > 0;
  // Start each field EMPTY (the floating label is the hint) unless a count is already saved, so typing a
  // number never appends to a pre-filled "0". Empty is treated as 0 for the total and on save.
  const [counts, setCounts] = useState<Record<string, string>>(
    () => Object.fromEntries(profiles.map((p) => [p.dev_profile_id, p.count ? String(p.count) : ""]))
  );
  const [notes, setNotes] = useState(notesHtml ?? "");
  const [busy, setBusy] = useState(false);
  // Smooth internal refresh after save (not an abrupt whole-page re-render); button stays "Saving…" until
  // the fresh server data lands.
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!pending) setBusy(false); }, [pending]);

  const total = useMemo(
    () => profiles.reduce((s, p) => s + Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0)), 0),
    [counts, profiles]
  );
  const countsDirty = useMemo(
    () => profiles.some((p) => Math.floor(Number(counts[p.dev_profile_id]) || 0) !== (p.count || 0)),
    [counts, profiles]
  );
  const notesDirty = strip(notes) !== strip(notesHtml);

  // Edit-mode: a saved summary shows read-only (with Edit) so it never looks "still being typed"; a
  // fresh day opens straight in edit mode. Cancel reverts to the saved values.
  const hasSaved = !!strip(notesHtml) || profiles.some((p) => p.count > 0);
  const [editing, setEditing] = useState(!hasSaved);
  const [copied, setCopied] = useState(false);
  const savedCount = (id: string) => Math.max(0, Math.floor(Number(counts[id]) || 0));

  function copy() {
    const lines = profiles.map((p) => ({ label: p.label, count: savedCount(p.dev_profile_id) }));
    navigator.clipboard
      .writeText(summaryShareText({ date: workDate, lines, hunted: huntedToday, notes }))
      .then(() => { setCopied(true); toast.success("Summary copied"); setTimeout(() => setCopied(false), 1500); })
      .catch(() => toast.error("Copy failed"));
  }
  function cancelEdit() {
    setCounts(Object.fromEntries(profiles.map((p) => [p.dev_profile_id, p.count ? String(p.count) : ""])));
    setNotes(notesHtml ?? "");
    setEditing(false);
  }

  async function save() {
    if (!countsDirty && !notesDirty) return;
    setBusy(true);
    try {
      if (isBd && countsDirty) {
        const payload = profiles.map((p) => ({ dev_profile_id: p.dev_profile_id, count: Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0)) }));
        const r = await fetch("/api/bd/job-counts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ work_date: workDate, counts: payload }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not save the job counts");
      }
      // Notes are OPTIONAL (a BD may only be logging job counts). Only save when there's actual text —
      // an empty note is simply skipped, never an error.
      if (notesDirty && strip(notes)) {
        if (!checkedIn) throw new Error("Check in first, then add your notes.");
        const r = await fetch("/api/attendance/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ work_date: workDate, html: notes }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not save your notes");
      }
      toast.success("Today's summary saved");
      setEditing(false); // back to the read-only "saved" state
      startTransition(() => router.refresh()); // busy stays on until the refetch lands (cleared by the effect)
    } catch (e) {
      setBusy(false);
      toast.error((e as Error).message);
    }
  }

  const jobsHuntedRow = (
    <div className="flex items-center justify-between rounded-md border border-border px-4 py-2.5">
      <span className="text-caption text-text-secondary">Jobs hunted today <span className="text-text-secondary/70">(auto-counted from the job board)</span></span>
      <span className="text-h3 font-semibold text-text-primary tabular">{huntedToday}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><NotebookPen className="size-4 text-brand-primary" /> Today&apos;s summary</CardTitle>
          <p className="text-caption text-text-secondary">
            {isBd
              ? "Your job applications per profile, plus a note on anything else you did today."
              : "A couple of lines on what you worked on today."}
          </p>
        </div>
        {/* Copy (for Slack) + Edit — only when there IS a saved summary and we're not editing. */}
        {!editing && hasSaved && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} Copy</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-3.5" /> Edit</Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {!editing ? (
          // ── Read-only "saved" view ──────────────────────────────────────────────────────────────
          <>
            {isBd && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-text-primary">Job applications</div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/50 px-4 py-3">
                  <div>
                    <div className="text-caption text-text-secondary">Total applications today</div>
                    <div className="text-h2 font-semibold text-text-primary tabular">{total}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((p) => (
                      <span key={p.dev_profile_id} className="rounded-md border border-border bg-white px-2.5 py-1 text-caption text-text-secondary">
                        #{p.profile_no} <span className="font-medium text-text-primary tabular">{savedCount(p.dev_profile_id)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {jobsHuntedRow}
              </div>
            )}
            {strip(notes) ? (
              <div className="space-y-1.5">
                {isBd && <div className="text-sm font-medium text-text-primary">Notes</div>}
                <div className={`rounded-md border border-border p-3 text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: notes }} />
              </div>
            ) : isBd ? null : (
              <p className="text-caption text-text-secondary">Nothing logged yet. Click Edit to add your summary.</p>
            )}
          </>
        ) : (
          // ── Edit view ───────────────────────────────────────────────────────────────────────────
          <>
            {isBd && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-text-primary">Job applications</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profiles.map((p) => (
                    <FloatInput key={p.dev_profile_id} type="number" min={0} inputMode="numeric" label={p.label}
                      value={counts[p.dev_profile_id] ?? ""} disabled={busy}
                      onChange={(e) => setCounts((c) => ({ ...c, [p.dev_profile_id]: e.target.value }))} />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/50 px-4 py-3">
                  <div>
                    <div className="text-caption text-text-secondary">Total applications today</div>
                    <div className="text-h2 font-semibold text-text-primary tabular">{total}</div>
                  </div>
                </div>
                {jobsHuntedRow}
              </div>
            )}
            <div className="space-y-2">
              {isBd && <div className="text-sm font-medium text-text-primary">Notes <span className="font-normal text-text-secondary">(optional)</span></div>}
              <RichText value={notes} onChange={setNotes} placeholder={isBd ? "Meetings, profiles created or matured, help given to juniors…" : "e.g. What you designed / built / fixed today…"} />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={save} disabled={busy || pending || (!countsDirty && !notesDirty)}>{busy || pending ? "Saving…" : "Save today's summary"}</Button>
              {hasSaved && <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy || pending}>Cancel</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
