"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { labelize, ASSESSMENT_STATUS, PRIORITIES, DURATIONS } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";

export function AssessmentForm({
  id,
  leadId,
  devProfileId,
  company,
  developers,
  initial,
  onDone,
}: {
  id?: string;
  leadId?: string;
  devProfileId?: string | null;
  company?: string | null;
  developers: Opt[];
  initial?: Partial<Record<string, string | null>>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    job_title: initial?.job_title ?? "",
    company: initial?.company ?? company ?? "",
    status: initial?.status ?? "pending",
    priority: initial?.priority ?? "medium",
    duration: initial?.duration ?? "",
    entry_date: initial?.entry_date ?? "",
    deadline: initial?.deadline ?? "",
    completion_date: initial?.completion_date ?? "",
    completed_by: initial?.completed_by ?? "",
    budget: initial?.budget ?? "",
    mail_subject: initial?.mail_subject ?? "",
    job_post_url: initial?.job_post_url ?? "",
    assessment_link: initial?.assessment_link ?? "",
    job_description: initial?.job_description ?? "",
    notes: initial?.notes ?? "",
    extra: initial?.extra ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, ...(id ? {} : { lead_id: leadId ?? null, dev_profile_id: devProfileId ?? null }) };
    const res = await fetch(id ? `/api/crm/assessments/${id}` : "/api/crm/assessments", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(id ? "Assessment saved" : "Assessment added");
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5"><Label>Job title</Label><Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {ASSESSMENT_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <select className={`${selectCls} capitalize`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
          {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Duration</Label>
        <select className={selectCls} value={form.duration} onChange={(e) => set("duration", e.target.value)}>
          <option value="">—</option>
          {DURATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label>Entry date</Label><Input type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Completion date</Label><Input type="date" value={form.completion_date} onChange={(e) => set("completion_date", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Completed by (developer)</Label>
        <select className={selectCls} value={form.completed_by} onChange={(e) => set("completed_by", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label>Budget</Label><Input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. $55-60/hr" /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Mail subject</Label><Input value={form.mail_subject} onChange={(e) => set("mail_subject", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Job post URL</Label><Input value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Assessment link</Label><Input value={form.assessment_link} onChange={(e) => set("assessment_link", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-4"><Label>Job description</Label><Input value={form.job_description} onChange={(e) => set("job_description", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><Label>Extra</Label><Input value={form.extra} onChange={(e) => set("extra", e.target.value)} /></div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save assessment" : "Add assessment"}</Button>
      </div>
    </form>
  );
}
