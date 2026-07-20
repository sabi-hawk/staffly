"use client";
// One consolidated end-of-day "Today's summary" for everyone. For a BD (owns ≥1 profile) it captures
// per-profile job-application counts (with a live total) AND free-text Notes for other work (meetings,
// creating/maturing profiles, etc.); for everyone else it's just the Notes. One Save writes both — so a
// BD no longer fills counts up top and a summary down below separately. The text part is "Notes"; the
// whole form is the day's "summary".
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { RichText } from "@/components/crm/rich-text";
import type { ProfileCount } from "@/lib/services/bd-jobs";

const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export function DailyReport({
  profiles,
  workDate,
  checkedIn,
  notesHtml,
}: {
  profiles: ProfileCount[];
  workDate: string;
  checkedIn: boolean;
  notesHtml: string | null;
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
      startTransition(() => router.refresh()); // busy stays on until the refetch lands (cleared by the effect)
    } catch (e) {
      setBusy(false);
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><NotebookPen className="size-4 text-brand-primary" /> Today&apos;s summary</CardTitle>
        <p className="text-caption text-text-secondary">
          {isBd
            ? "Your job applications per profile, plus a note on anything else you did today (meetings, creating or maturing profiles, etc.)."
            : "A couple of lines on what you worked on today."}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isBd && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-primary">Job applications</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {profiles.map((p) => (
                <FloatInput
                  key={p.dev_profile_id}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  label={p.label}
                  value={counts[p.dev_profile_id] ?? ""}
                  disabled={busy}
                  onChange={(e) => setCounts((c) => ({ ...c, [p.dev_profile_id]: e.target.value }))}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/50 px-4 py-3">
              <div>
                <div className="text-caption text-text-secondary">Total applications today</div>
                <div className="text-h2 font-semibold text-text-primary tabular">{total}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <span key={p.dev_profile_id} className="rounded-md border border-border bg-white px-2.5 py-1 text-caption text-text-secondary">
                    #{p.profile_no} <span className="font-medium text-text-primary tabular">{Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0))}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isBd && <div className="text-sm font-medium text-text-primary">Notes <span className="font-normal text-text-secondary">(optional)</span></div>}
          <RichText value={notes} onChange={setNotes} placeholder={isBd ? "Meetings, profiles created or matured, help given to juniors…" : "e.g. What you designed / built / fixed today…"} />
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={busy || pending || (!countsDirty && !notesDirty)}>{busy || pending ? "Saving…" : "Save today's summary"}</Button>
          {!countsDirty && !notesDirty && (strip(notesHtml) || (isBd && profiles.some((p) => p.count > 0))) && (
            <span className="text-caption text-text-secondary">Saved.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
