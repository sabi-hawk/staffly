"use client";
// Type-first Add flow (FRD-07): pick Interview or Assessment → New company (creates a lead) or
// Existing company (searchable, recent-first → attaches). Creates the lead if new, then the activity.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { INTERVIEW_ROUND, PRIORITIES } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
import type { Opt } from "@/lib/crm/options";

type LeadOpt = { id: string; company: string };
const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";
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
            <div className="space-y-1.5">
              <Label htmlFor="add-company">Company</Label>
              <Input id="add-company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="add-search">Existing company</Label>
              <Input
                id="add-search"
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearch(v);
                  // editing the text away from the picked company clears the selection (avoids a stale pick)
                  if (leadId && v !== leads.find((l) => l.id === leadId)?.company) setLeadId("");
                }}
                placeholder="Search companies…"
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
            <div className="space-y-1.5">
              <Label htmlFor="add-profile">Profile (optional)</Label>
              <select id="add-profile" className={selectCls} value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                <option value="">—</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-received">Received (email date)</Label>
              <Input id="add-received" type="date" value={received} onChange={(e) => setReceived(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-job">Job title (optional)</Label>
            <Input id="add-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Full-Stack Engineer" />
          </div>

          {type === "interview" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-round">Round</Label>
                <select id="add-round" className={selectCls} value={round} onChange={(e) => setRound(e.target.value)}>
                  {INTERVIEW_ROUND.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-when">Interview at (optional)</Label>
                <Input id="add-when" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-deadline">Deadline (optional)</Label>
                <Input id="add-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-priority">Priority (optional)</Label>
                <select id="add-priority" className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">—</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
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
