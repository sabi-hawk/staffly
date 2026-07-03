"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { labelize, INTERVIEW_STATUS, INTERVIEW_ROUND, INTERVIEW_OUTCOME } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";

// stored UTC ISO → datetime-local in Asia/Karachi (UTC+5, no DST)
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 16);
}
// datetime-local (Karachi) → UTC ISO
function toUtcIso(local: string): string | null {
  if (!local) return null;
  return new Date(local + ":00+05:00").toISOString();
}

export function InterviewForm({
  id,
  leadId,
  devProfileId,
  company,
  developers,
  initial,
  defaultDeveloper,
  onDone,
}: {
  id?: string;
  leadId?: string;
  devProfileId?: string | null;
  company?: string | null;
  developers: Opt[];
  initial?: Partial<Record<string, string | null>>;
  defaultDeveloper?: string | null; // round-1 developer — later rounds default to the same person (FRD-02)
  onDone?: () => void;
}) {
  const router = useRouter();
  // For a NEW round on an existing lead, default the developer to round 1's (the same-developer rule).
  const devDefault = id ? "" : defaultDeveloper ?? "";
  const [form, setForm] = useState<Record<string, string>>({
    job_title: initial?.job_title ?? "",
    company: initial?.company ?? company ?? "",
    job_post_url: initial?.job_post_url ?? "",
    status: initial?.status ?? "scheduled",
    round: initial?.round ?? "1st",
    outcome: initial?.outcome ?? "pending",
    given_by: initial?.given_by ?? devDefault,
    whom_should_give: initial?.whom_should_give ?? devDefault,
    interview_at: toLocalInput(initial?.interview_at),
    notes: initial?.notes ?? "",
    notes2: initial?.notes2 ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      interview_at: toUtcIso(form.interview_at),
      ...(id ? {} : { lead_id: leadId ?? null, dev_profile_id: devProfileId ?? null }),
    };
    const res = await fetch(id ? `/api/crm/interviews/${id}` : "/api/crm/interviews", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(id ? "Interview saved" : "Interview added");
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5"><Label htmlFor="interview-job-title">Job title</Label><Input id="interview-job-title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="interview-company">Company</Label><Input id="interview-company" value={form.company} onChange={(e) => set("company", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="interview-job-post-url">Job post URL</Label><Input id="interview-job-post-url" value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-status">Status</Label>
        <select id="interview-status" className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-round">Round</Label>
        <select id="interview-round" className={selectCls} value={form.round} onChange={(e) => set("round", e.target.value)}>
          {INTERVIEW_ROUND.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-outcome">Outcome</Label>
        <select id="interview-outcome" className={`${selectCls} capitalize`} value={form.outcome} onChange={(e) => set("outcome", e.target.value)}>
          {INTERVIEW_OUTCOME.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="interview-interview-at">Interview time</Label><Input id="interview-interview-at" type="datetime-local" value={form.interview_at} onChange={(e) => set("interview_at", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-given-by">Given by (developer)</Label>
        <select id="interview-given-by" className={selectCls} value={form.given_by} onChange={(e) => set("given_by", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-whom-should-give">Whom should give (next rounds)</Label>
        <select id="interview-whom-should-give" className={selectCls} value={form.whom_should_give} onChange={(e) => set("whom_should_give", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="interview-notes">Notes</Label><Input id="interview-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="interview-notes2">Notes 2</Label><Input id="interview-notes2" value={form.notes2} onChange={(e) => set("notes2", e.target.value)} /></div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save interview" : "Add interview"}</Button>
      </div>
    </form>
  );
}
