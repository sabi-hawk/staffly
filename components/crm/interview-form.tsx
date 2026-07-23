"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { INTERVIEW_HINTS } from "@/lib/crm/field-hints";
import { labelize, roundLabel, INTERVIEW_STATUS, INTERVIEW_ROUND, INTERVIEW_OUTCOME, INTERVIEW_DURATIONS, durationMinLabel, INTERVIEW_ROUND_NAMES } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
import type { Opt } from "@/lib/crm/options";

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
  compact = false,
  role,
}: {
  id?: string;
  leadId?: string;
  devProfileId?: string | null;
  company?: string | null;
  developers: Opt[];
  initial?: Partial<Record<string, string | null>>;
  defaultDeveloper?: string | null; // round-1 developer — later rounds default to the same person (FRD-02)
  onDone?: () => void;
  compact?: boolean; // rendered inside a lead — hide company/job title/job-post URL (shown on the lead header)
  role?: string | null; // the lead's role, used as the (hidden) job-title default in compact mode
}) {
  const router = useRouter();
  // For a NEW round on an existing lead, default the developer to round 1's (the same-developer rule).
  const devDefault = id ? "" : defaultDeveloper ?? "";
  const [form, setForm] = useState<Record<string, string>>({
    job_title: initial?.job_title ?? role ?? "",
    company: initial?.company ?? company ?? "",
    job_post_url: initial?.job_post_url ?? "",
    status: initial?.status ?? "scheduled",
    round: initial?.round ?? "1st",
    outcome: initial?.outcome ?? "pending",
    round_name: initial?.round_name ?? "",
    given_by: initial?.given_by ?? devDefault,
    whom_should_give: initial?.whom_should_give ?? devDefault,
    interview_at: toLocalInput(initial?.interview_at),
    duration_min: initial?.duration_min != null ? String(initial.duration_min) : "60",
    meeting_link: initial?.meeting_link ?? "",
    received_date: initial?.received_date ?? (id ? "" : companyToday()), // email-received date; default today on create
    notes: initial?.notes ?? "",
    notes2: initial?.notes2 ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // People on the call besides us (client interviewers / panel) — a repeatable {name, note} list.
  type Person = { name: string; note: string };
  const initParticipants: Person[] = Array.isArray((initial as any)?.participants)
    ? ((initial as any).participants as any[]).map((p) => ({ name: String(p?.name ?? ""), note: String(p?.note ?? "") }))
    : [];
  const [participants, setParticipants] = useState<Person[]>(initParticipants);
  const setPerson = (i: number, k: keyof Person, v: string) => setParticipants((s) => s.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const addPerson = () => setParticipants((s) => [...s, { name: "", note: "" }]);
  const removePerson = (i: number) => setParticipants((s) => s.filter((_, idx) => idx !== i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      interview_at: toUtcIso(form.interview_at),
      duration_min: Number(form.duration_min) || 60, // int column — send a number, not "60"
      participants: participants.filter((p) => p.name.trim() || p.note.trim()),
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
      {!compact && <>
        <FloatInput id="interview-job-title" label="Job title" hint={INTERVIEW_HINTS.job_title} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
        <FloatInput id="interview-company" label="Company" hint={INTERVIEW_HINTS.company} value={form.company} onChange={(e) => set("company", e.target.value)} />
        <FloatInput id="interview-job-post-url" label="Job post URL" hint={INTERVIEW_HINTS.job_post_url} wrapClassName="lg:col-span-2" value={form.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} />
      </>}
      <FloatSelect
        id="interview-status"
        label="Status"
        hint={INTERVIEW_HINTS.status}
        className="capitalize"
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {INTERVIEW_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
      </FloatSelect>
      <FloatSelect
        id="interview-round"
        label="Round"
        hint={INTERVIEW_HINTS.round}
        value={form.round}
        onChange={(e) => set("round", e.target.value)}
      >
        {INTERVIEW_ROUND.map((s) => <option key={s} value={s}>{roundLabel(s)}</option>)}
      </FloatSelect>
      <FloatInput
        id="interview-round-name"
        label="Round name"
        hint="What kind of round it is — Initial call, Technical round 1, Architectural round… Pick a suggestion or type your own."
        list="interview-round-names"
        value={form.round_name}
        onChange={(e) => set("round_name", e.target.value)}
      />
      <datalist id="interview-round-names">
        {INTERVIEW_ROUND_NAMES.map((n) => <option key={n} value={n} />)}
      </datalist>
      <FloatSelect
        id="interview-outcome"
        label="Outcome"
        hint={INTERVIEW_HINTS.outcome}
        className="capitalize"
        value={form.outcome}
        onChange={(e) => set("outcome", e.target.value)}
      >
        {INTERVIEW_OUTCOME.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
      </FloatSelect>
      <DatePicker id="interview-received" label="Received (email date)" hint={INTERVIEW_HINTS.received_date} value={form.received_date} onChange={(v) => set("received_date", v)} />
      <DateTimePicker id="interview-interview-at" label="Interview time" hint={INTERVIEW_HINTS.interview_at} value={form.interview_at} onChange={(v) => set("interview_at", v)} />
      <FloatSelect
        id="interview-duration"
        label="Duration"
        hint="How long the call is booked for. Sets the end time on the calendar event (start + duration)."
        value={form.duration_min}
        onChange={(e) => set("duration_min", e.target.value)}
      >
        {INTERVIEW_DURATIONS.map((m) => <option key={m} value={m}>{durationMinLabel(m)}</option>)}
      </FloatSelect>
      <FloatInput id="interview-meeting-link" label="Meeting link" hint="Zoom / Google Meet / other link for this interview — paste it so it's one click to join." wrapClassName="lg:col-span-2" value={form.meeting_link} onChange={(e) => set("meeting_link", e.target.value)} />
      <FloatSelect
        id="interview-given-by"
        label="Given by (developer)"
        hint={INTERVIEW_HINTS.given_by}
        value={form.given_by}
        onChange={(e) => set("given_by", e.target.value)}
      >
        <option value="">Not set</option>
        {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </FloatSelect>
      <FloatSelect
        id="interview-whom-should-give"
        label="Whom should give (next rounds)"
        hint={INTERVIEW_HINTS.whom_should_give}
        value={form.whom_should_give}
        onChange={(e) => set("whom_should_give", e.target.value)}
      >
        <option value="">Not set</option>
        {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </FloatSelect>
      <FloatInput id="interview-notes" label="Notes" hint="How the interview went. Notes from the developer or client." wrapClassName="lg:col-span-2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      <FloatInput id="interview-notes2" label="Notes 2" hint="Overflow notes when the main Notes field is full, e.g. follow-up details or client remarks." wrapClassName="lg:col-span-2" value={form.notes2} onChange={(e) => set("notes2", e.target.value)} />

      {/* People on the call (besides us) — a repeatable name + detail list. */}
      <div className="space-y-2 rounded-md border border-dashed border-border p-3 sm:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wide text-text-secondary">People on the call</span>
          <Button type="button" size="sm" variant="outline" onClick={addPerson}><Plus className="size-3.5" /> Add person</Button>
        </div>
        {participants.length === 0 && <p className="text-caption text-text-secondary">Client-side interviewers or panel members besides us. Add each person&apos;s name and any detail (designation, LinkedIn URL, contact).</p>}
        {participants.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <FloatInput id={`participant-name-${i}`} label="Name" value={p.name} onChange={(e) => setPerson(i, "name", e.target.value)} wrapClassName="w-56" />
            <FloatInput id={`participant-note-${i}`} label="Designation / LinkedIn / contact" value={p.note} onChange={(e) => setPerson(i, "note", e.target.value)} wrapClassName="min-w-[16rem] flex-1" />
            <button type="button" onClick={() => removePerson(i)} className="mb-1 rounded-md p-2 text-text-secondary hover:text-danger" aria-label="Remove person"><X className="size-4" /></button>
          </div>
        ))}
      </div>

      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : id ? "Save interview" : "Add interview"}</Button>
      </div>
    </form>
  );
}
