"use client";
// Type-first Add flow (FRD-07): pick Interview or Assessment → New company (creates a lead) or
// Existing company (searchable, recent-first → attaches). Creates the lead if new, then the activity.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { INTERVIEW_HINTS, ASSESSMENT_HINTS } from "@/lib/crm/field-hints";
import { INTERVIEW_ROUND, PRIORITIES } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
import type { Opt } from "@/lib/crm/options";

type LeadOpt = { id: string; company: string };
const seg = (on: boolean) =>
  `flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${on ? "bg-brand-primary text-white" : "bg-surface text-text-secondary hover:text-text-primary"}`;

export function AddActivity({ leads, profiles }: { leads: LeadOpt[]; profiles: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<"interview" | "assessment">("interview");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newCompany, setNewCompany] = useState("");
  const [leadId, setLeadId] = useState("");
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [received, setReceived] = useState(companyToday());
  const [round, setRound] = useState<string>("1st");
  const [interviewAt, setInterviewAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("");

  const filtered = useMemo(
    () => leads.filter((l) => l.company.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [leads, search]
  );
  const selectedCompany = mode === "new" ? newCompany.trim() : leads.find((l) => l.id === leadId)?.company ?? "";

  function reset() {
    setType("interview"); setMode("new"); setNewCompany(""); setLeadId(""); setSearch("");
    setProfileId(""); setJobTitle(""); setReceived(companyToday()); setRound("1st");
    setInterviewAt(""); setDeadline(""); setPriority("");
  }

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json as { id: string };
  }

  async function submit() {
    if (mode === "new" && !newCompany.trim()) return toast.error("Enter a company name");
    if (mode === "existing" && !leadId) return toast.error("Pick an existing company");
    setBusy(true);
    try {
      // resolve the lead (create it for a new company)
      let lid = leadId;
      if (mode === "new") {
        const lead = await post("/api/crm/leads", {
          company: newCompany.trim(),
          dev_profile_id: profileId || null,
          status: "in_progress",
        });
        lid = lead.id;
      }
      const base = { lead_id: lid, company: selectedCompany, dev_profile_id: profileId || null, job_title: jobTitle || null };
      if (type === "interview") {
        await post("/api/crm/interviews", { ...base, received_date: received || null, round, interview_at: interviewAt || null });
      } else {
        await post("/api/crm/assessments", { ...base, entry_date: received || null, deadline: deadline || null, priority: priority || null });
      }
      toast.success(mode === "new" ? "Lead created" : `${type === "interview" ? "Interview" : "Assessment"} added`);
      setOpen(false); reset(); router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Add</Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-soft" role="dialog" aria-modal="true" aria-label="Add interview or assessment">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-text-primary">Add to CRM</h2>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button className={seg(type === "interview")} onClick={() => setType("interview")}>Interview</button>
            <button className={seg(type === "assessment")} onClick={() => setType("assessment")}>Assessment</button>
          </div>

          <div className="flex gap-2">
            <button className={seg(mode === "new")} onClick={() => { setMode("new"); setRound("1st"); }}>New company</button>
            <button className={seg(mode === "existing")} onClick={() => { setMode("existing"); setRound("2nd"); }}>Existing company</button>
          </div>

          {mode === "new" ? (
            <FloatInput
              id="add-company"
              label="Company"
              hint="The client company this came from, e.g. Acme Corp. A new lead is created with this name."
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />
          ) : (
            <div className="space-y-1.5">
              <FloatInput
                id="add-search"
                label="Existing company"
                hint="Type to search your existing leads, then pick the company from the list below. The activity attaches to that lead."
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearch(v);
                  // editing the text away from the picked company clears the selection (avoids a stale pick)
                  if (leadId && v !== leads.find((l) => l.id === leadId)?.company) setLeadId("");
                }}
              />
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {filtered.length === 0 && <div className="px-3 py-2 text-caption text-text-secondary">No matches.</div>}
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLeadId(l.id); setSearch(l.company); }}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-surface ${leadId === l.id ? "bg-brand-light text-brand-primary" : ""}`}
                  >
                    {l.company}
                  </button>
                ))}
              </div>
              {leadId && <div className="text-caption text-brand-primary">Selected: {selectedCompany}</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FloatSelect
              id="add-profile"
              label="Profile (optional)"
              hint="Which of our dev profiles this activity is under. Leave unset if not decided yet."
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <option value="">Not set</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </FloatSelect>
            <DatePicker
              id="add-received"
              label="Received (email date)"
              hint="The date the request email arrived. Defaults to today."
              value={received}
              onChange={setReceived}
            />
          </div>

          <FloatInput
            id="add-job"
            label="Job title (optional)"
            hint="The role this is for, e.g. Senior Full Stack Engineer."
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />

          {type === "interview" ? (
            <div className="grid grid-cols-2 gap-3">
              <FloatSelect
                id="add-round"
                label="Round"
                hint={INTERVIEW_HINTS.round}
                value={round}
                onChange={(e) => setRound(e.target.value)}
              >
                {INTERVIEW_ROUND.map((r) => <option key={r} value={r}>{r}</option>)}
              </FloatSelect>
              <DateTimePicker id="add-when" label="Interview at (optional)" hint={INTERVIEW_HINTS.interview_at} value={interviewAt} onChange={setInterviewAt} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                id="add-deadline"
                label="Deadline (optional)"
                hint={ASSESSMENT_HINTS.deadline}
                value={deadline}
                onChange={setDeadline}
              />
              <FloatSelect
                id="add-priority"
                label="Priority (optional)"
                hint={ASSESSMENT_HINTS.priority}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">Not set</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </FloatSelect>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
