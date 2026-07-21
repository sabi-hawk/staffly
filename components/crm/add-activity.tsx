"use client";
// Type-first Add flow (FRD-07): pick Interview or Assessment → New company (creates a lead) or
// Existing company (searchable dropdown, recent-first → attaches). Creates the lead if new, then the activity.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Search, Check, CalendarClock, ClipboardList, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { INTERVIEW_HINTS, ASSESSMENT_HINTS } from "@/lib/crm/field-hints";
import { INTERVIEW_ROUND, roundLabel, PRIORITIES } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Opt } from "@/lib/crm/options";

type LeadOpt = { id: string; company: string };

/** Sleek segmented toggle: one active option per row. */
function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string; icon?: any }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              on ? "bg-white text-brand-primary shadow-card" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {o.icon && <o.icon className="size-4" />} {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Searchable company dropdown: opens below on focus, filters as you type, recent-first. */
function CompanyCombobox({ leads, leadId, onPick }: { leads: LeadOpt[]; leadId: string; onPick: (id: string, company: string) => void }) {
  const [search, setSearch] = useState(leads.find((l) => l.id === leadId)?.company ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  // no search text → recent-first (already ordered); with text → filter across all
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (q ? leads.filter((l) => l.company.toLowerCase().includes(q)) : leads).slice(0, 50);
  }, [leads, search]);

  return (
    <div className="relative" ref={ref}>
      <div className="group relative" data-filled="true">
        <div className="pointer-events-none absolute left-2.5 top-0 z-[1] -translate-y-1/2 bg-white px-1 text-[11px] font-medium text-text-secondary/80">Existing company *</div>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); if (leadId) onPick("", ""); }}
          placeholder="Search companies…"
          className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-text-primary transition-colors hover:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/70"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-soft">
          {filtered.length === 0 && <div className="px-3 py-2 text-caption text-text-secondary">No companies match.</div>}
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onPick(l.id, l.company); setSearch(l.company); setOpen(false); }}
              className={cn("flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-surface", leadId === l.id && "text-brand-primary")}
            >
              {l.company}
              {leadId === l.id && <Check className="size-4 text-brand-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddActivity({ leads, profiles }: { leads: LeadOpt[]; profiles: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<"interview" | "assessment">("interview");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newCompany, setNewCompany] = useState("");
  const [leadId, setLeadId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [received, setReceived] = useState(companyToday());
  const [round, setRound] = useState<string>("1st");
  const [interviewAt, setInterviewAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("");

  const selectedCompany = mode === "new" ? newCompany.trim() : leads.find((l) => l.id === leadId)?.company ?? "";

  function reset() {
    setType("interview"); setMode("new"); setNewCompany(""); setLeadId("");
    setProfileId(""); setJobTitle(""); setReceived(companyToday()); setRound("1st");
    setInterviewAt(""); setDeadline(""); setPriority("");
  }

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json as { id: string };
  }

  async function submit() {
    if (mode === "new" && !newCompany.trim()) return toast.error("Enter a company name");
    if (mode === "existing" && !leadId) return toast.error("Pick an existing company");
    if (!profileId) return toast.error("Pick a profile");
    setBusy(true);
    try {
      let lid = leadId;
      if (mode === "new") {
        const lead = await post("/api/crm/leads", { company: newCompany.trim(), dev_profile_id: profileId, status: "in_progress" });
        lid = lead.id;
      }
      const base = { lead_id: lid, company: selectedCompany, dev_profile_id: profileId, job_title: jobTitle || null };
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
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 rounded-lg shadow-card">
        <span className="flex size-4 items-center justify-center rounded-full bg-white/25"><Plus className="size-3" /></span> Add
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-soft" role="dialog" aria-modal="true" aria-label="Add interview or assessment">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-text-primary">Add to CRM</h2>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="space-y-3.5">
          <Segmented
            options={[{ key: "interview", label: "Interview", icon: CalendarClock }, { key: "assessment", label: "Assessment", icon: ClipboardList }]}
            value={type}
            onChange={setType}
          />
          <Segmented
            options={[{ key: "new", label: "New company", icon: Plus }, { key: "existing", label: "Existing company", icon: Building2 }]}
            value={mode}
            onChange={(m) => { setMode(m); setRound(m === "existing" ? "2nd" : "1st"); }}
          />

          {mode === "new" ? (
            <FloatInput
              id="add-company"
              label="Company *"
              hint="The client company this came from, e.g. Acme Corp. A new lead is created with this name."
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />
          ) : (
            <CompanyCombobox leads={leads} leadId={leadId} onPick={(id) => setLeadId(id)} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Combobox id="add-profile" label="Profile *" hint="Which of our dev profiles this activity is under. Search by number, name, stack or email." options={profiles.map((p) => ({ value: p.id, label: p.label, sublabel: p.sublabel, color: p.color }))} value={profileId} onChange={setProfileId} placeholder="Select a profile…" searchPlaceholder="Search profiles…" />
            <DatePicker id="add-received" label="Received (email date)" hint="The date the request email arrived. Defaults to today." value={received} onChange={setReceived} />
          </div>

          <FloatInput id="add-job" label="Job title (optional)" hint="The role this is for, e.g. Senior Full Stack Engineer." value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />

          {type === "interview" ? (
            <div className="grid grid-cols-2 gap-3">
              <FloatSelect id="add-round" label="Round" hint={INTERVIEW_HINTS.round} value={round} onChange={(e) => setRound(e.target.value)}>
                {INTERVIEW_ROUND.map((r) => <option key={r} value={r}>{roundLabel(r)}</option>)}
              </FloatSelect>
              <DateTimePicker id="add-when" label="Interview at (optional)" hint={INTERVIEW_HINTS.interview_at} value={interviewAt} onChange={setInterviewAt} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker id="add-deadline" label="Deadline (optional)" hint={ASSESSMENT_HINTS.deadline} value={deadline} onChange={setDeadline} />
              <FloatSelect id="add-priority" label="Priority (optional)" hint={ASSESSMENT_HINTS.priority} value={priority} onChange={(e) => setPriority(e.target.value)}>
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
