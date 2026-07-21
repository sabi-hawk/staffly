"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { ASSESSMENT_HINTS } from "@/lib/crm/field-hints";
import { labelize, ASSESSMENT_STATUS, PRIORITIES, DURATIONS, CAMERA_OPTIONS } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
import type { Opt } from "@/lib/crm/options";

export function AssessmentForm({
  id,
  leadId,
  devProfileId,
  company,
  developers,
  categories = [],
  initial,
  onDone,
  compact = false,
  role,
}: {
  id?: string;
  leadId?: string;
  devProfileId?: string | null;
  company?: string | null;
  developers: Opt[];
  categories?: Opt[];
  initial?: Partial<Record<string, string | null>>;
  onDone?: () => void;
  compact?: boolean; // rendered inside a lead — hide company/job title/job-post URL (on the lead header)
  role?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    job_title: initial?.job_title ?? role ?? "",
    company: initial?.company ?? company ?? "",
    status: initial?.status ?? "pending",
    priority: initial?.priority ?? "medium",
    duration: initial?.duration ?? "",
    camera: initial?.camera ?? "",
    category_id: initial?.category_id ?? "",
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
      {!compact && <FloatInput id="assessment-job-title" label="Job title" hint={ASSESSMENT_HINTS.job_title} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />}
      {!compact && <FloatInput id="assessment-company" label="Company" hint={ASSESSMENT_HINTS.company} value={form.company} onChange={(e) => set("company", e.target.value)} />}
      <FloatSelect
        id="assessment-status"
        label="Status"
        hint={ASSESSMENT_HINTS.status}
        className="capitalize"
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {ASSESSMENT_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
      </FloatSelect>
      <FloatSelect
        id="assessment-priority"
        label="Priority"
        hint={ASSESSMENT_HINTS.priority}
        className="capitalize"
        value={form.priority}
        onChange={(e) => set("priority", e.target.value)}
      >
        {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
      </FloatSelect>
      <FloatSelect
        id="assessment-duration"
        label="Duration"
        hint={ASSESSMENT_HINTS.duration}
        value={form.duration}
        onChange={(e) => set("duration", e.target.value)}
      >
        <option value="">Not set</option>
        {DURATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </FloatSelect>
      <FloatSelect
        id="assessment-category"
        label="Category"
        hint="The kind of assessment: Coding, MCQs, Coding + MCQs, Video introduction, etc. Optional; leave unset if unknown. Configure the list from 'Manage categories' on the Assessments tab."
        value={form.category_id}
        onChange={(e) => set("category_id", e.target.value)}
      >
        <option value="">Not set</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </FloatSelect>
      <FloatSelect
        id="assessment-camera"
        label="Camera"
        hint="Whether the assessment is taken with the camera on. Optional; leave as 'Not determined' if you don't know yet."
        value={form.camera}
        onChange={(e) => set("camera", e.target.value)}
      >
        <option value="">Not determined</option>
        {CAMERA_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </FloatSelect>
      <DatePicker id="assessment-entry-date" label="Received (email date)" hint={ASSESSMENT_HINTS.received_date} value={form.entry_date} onChange={(v) => set("entry_date", v)} />
      <DatePicker id="assessment-deadline" label="Deadline" hint={ASSESSMENT_HINTS.deadline} value={form.deadline} onChange={(v) => set("deadline", v)} />
      <DatePicker id="assessment-completion-date" label="Completion date" hint="The date the assessment was actually submitted back to the client." value={form.completion_date} onChange={(v) => set("completion_date", v)} />
      <FloatSelect
        id="assessment-whom"
        label="Whom should complete (developer)"
        hint={ASSESSMENT_HINTS.whom_should_complete}
        value={form.whom_should_complete}
        onChange={(e) => set("whom_should_complete", e.target.value)}
      >
        <option value="">Not set</option>
        {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </FloatSelect>
      <FloatSelect
        id="assessment-completed-by"
        label="Completed by (developer)"
        hint={ASSESSMENT_HINTS.completed_by}
        value={form.completed_by}
        onChange={(e) => set("completed_by", e.target.value)}
      >
        <option value="">Not set</option>
        {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </FloatSelect>
      <FloatInput id="assessment-budget" label="Budget" hint={ASSESSMENT_HINTS.budget} value={form.budget} onChange={(e) => set("budget", e.target.value)} />
      <FloatInput id="assessment-mail-subject" label="Mail subject" hint="The subject line of the email that delivered the assessment, so it is easy to find in the inbox later." wrapClassName="lg:col-span-2" value={form.mail_subject} onChange={(e) => set("mail_subject", e.target.value)} />
      {!compact && <FloatInput id="assessment-job-post-url" label="Job post URL" hint={ASSESSMENT_HINTS.job_post_url} wrapClassName="lg:col-span-2" value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} />}
      <FloatInput id="assessment-assessment-link" label="Assessment link" hint="Direct link to the assessment task or platform, e.g. HackerRank or a shared doc." wrapClassName="lg:col-span-2" value={form.assessment_link} onChange={(e) => set("assessment_link", e.target.value)} />
      <FloatInput id="assessment-job-description" label="Job description" hint="The job description text or a short summary of the role requirements, for whoever completes the assessment." wrapClassName="lg:col-span-4" value={form.job_description} onChange={(e) => set("job_description", e.target.value)} />
      <FloatInput id="assessment-notes" label="Notes" hint={ASSESSMENT_HINTS.feedback} wrapClassName="lg:col-span-2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      <FloatInput id="assessment-extra" label="Extra" hint="Anything else worth recording that does not fit the other fields." wrapClassName="lg:col-span-2" value={form.extra} onChange={(e) => set("extra", e.target.value)} />
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save assessment" : "Add assessment"}</Button>
      </div>
    </form>
  );
}
