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
      <div className="space-y-1.5"><Label>Job title</Label><Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Job post URL</Label><Input value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Round</Label>
        <select className={selectCls} value={form.round} onChange={(e) => set("round", e.target.value)}>
          {INTERVIEW_ROUND.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Outcome</Label>
        <select className={`${selectCls} capitalize`} value={form.outcome} onChange={(e) => set("outcome", e.target.value)}>
          {INTERVIEW_OUTCOME.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label>Interview time</Label><Input type="datetime-local" value={form.interview_at} onChange={(e) => set("interview_at", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Given by (developer)</Label>
        <select className={selectCls} value={form.given_by} onChange={(e) => set("given_by", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Whom should give (next rounds)</Label>
        <select className={selectCls} value={form.whom_should_give} onChange={(e) => set("whom_should_give", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Notes 2</Label><Input value={form.notes2} onChange={(e) => set("notes2", e.target.value)} /></div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save interview" : "Add interview"}</Button>
      </div>
    </form>
  );
}
