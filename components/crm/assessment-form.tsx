"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/crm/field-label";
import { ASSESSMENT_HINTS } from "@/lib/crm/field-hints";
import { labelize, ASSESSMENT_STATUS, PRIORITIES, DURATIONS } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
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
    entry_date: initial?.entry_date ?? (id ? "" : companyToday()), // "Received" — default today on create
    deadline: initial?.deadline ?? "",
    completion_date: initial?.completion_date ?? "",
    completed_by: initial?.completed_by ?? "",
    whom_should_complete: initial?.whom_should_complete ?? "",
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
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-job-title" hint={ASSESSMENT_HINTS.job_title}>Job title</FieldLabel><Input id="assessment-job-title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></div>
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-company" hint={ASSESSMENT_HINTS.company}>Company</FieldLabel><Input id="assessment-company" value={form.company} onChange={(e) => set("company", e.target.value)} /></div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-status" hint={ASSESSMENT_HINTS.status}>Status</FieldLabel>
        <select id="assessment-status" className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {ASSESSMENT_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-priority" hint={ASSESSMENT_HINTS.priority}>Priority</FieldLabel>
        <select id="assessment-priority" className={`${selectCls} capitalize`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
          {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-duration" hint={ASSESSMENT_HINTS.duration}>Duration</FieldLabel>
        <select id="assessment-duration" className={selectCls} value={form.duration} onChange={(e) => set("duration", e.target.value)}>
          <option value="">—</option>
          {DURATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-entry-date" hint={ASSESSMENT_HINTS.received_date}>Received (email date)</FieldLabel><Input id="assessment-entry-date" type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} /></div>
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-deadline" hint={ASSESSMENT_HINTS.deadline}>Deadline</FieldLabel><Input id="assessment-deadline" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-completion-date">Completion date</FieldLabel><Input id="assessment-completion-date" type="date" value={form.completion_date} onChange={(e) => set("completion_date", e.target.value)} /></div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-whom" hint={ASSESSMENT_HINTS.whom_should_complete}>Whom should complete (developer)</FieldLabel>
        <select id="assessment-whom" className={selectCls} value={form.whom_should_complete} onChange={(e) => set("whom_should_complete", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-completed-by" hint={ASSESSMENT_HINTS.completed_by}>Completed by (developer)</FieldLabel>
        <select id="assessment-completed-by" className={selectCls} value={form.completed_by} onChange={(e) => set("completed_by", e.target.value)}>
          <option value="">—</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><FieldLabel htmlFor="assessment-budget" hint={ASSESSMENT_HINTS.budget}>Budget</FieldLabel><Input id="assessment-budget" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. $55-60/hr" /></div>
      <div className="space-y-1.5 lg:col-span-2"><FieldLabel htmlFor="assessment-mail-subject">Mail subject</FieldLabel><Input id="assessment-mail-subject" value={form.mail_subject} onChange={(e) => set("mail_subject", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><FieldLabel htmlFor="assessment-job-post-url" hint={ASSESSMENT_HINTS.job_post_url}>Job post URL</FieldLabel><Input id="assessment-job-post-url" value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><FieldLabel htmlFor="assessment-assessment-link">Assessment link</FieldLabel><Input id="assessment-assessment-link" value={form.assessment_link} onChange={(e) => set("assessment_link", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-4"><FieldLabel htmlFor="assessment-job-description">Job description</FieldLabel><Input id="assessment-job-description" value={form.job_description} onChange={(e) => set("job_description", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><FieldLabel htmlFor="assessment-notes" hint={ASSESSMENT_HINTS.feedback}>Notes</FieldLabel><Input id="assessment-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <div className="space-y-1.5 lg:col-span-2"><FieldLabel htmlFor="assessment-extra">Extra</FieldLabel><Input id="assessment-extra" value={form.extra} onChange={(e) => set("extra", e.target.value)} /></div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save assessment" : "Add assessment"}</Button>
      </div>
    </form>
  );
}
