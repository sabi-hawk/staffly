"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { RichText } from "@/components/crm/rich-text";
import { labelize, LEAD_STATUS, LEAD_REASON_STATUSES } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";
// rejected/dismissed require a reason → set via the dismiss/status action, not the plain dropdown.
const MANUAL_STATUSES = LEAD_STATUS.filter((s) => !(LEAD_REASON_STATUSES as readonly string[]).includes(s));

// Create-only form used by /crm/leads/new. Editing an existing lead happens IN PLACE on the lead
// detail page (LeadDetailsCard + LeadRichSection), not through this form.
export function LeadForm({
  profiles,
  owners,
  canAssignOwner,
}: {
  profiles: Opt[];
  owners: Opt[];
  canAssignOwner: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    company: "",
    role: "",
    dev_profile_id: "",
    status: "in_progress",
    owner_bd_id: "",
    budget: "",
    expected_budget: "",
    shift: "",
    job_description: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success("Lead created");
    router.push(`/crm/leads/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="lead-company">Company *</Label>
        <Input id="lead-company" required value={form.company} onChange={(e) => set("company", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-role">Role</Label>
        <Input id="lead-role" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Senior Full Stack" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-profile">Profile</Label>
        <select id="lead-profile" className={selectCls} value={form.dev_profile_id} onChange={(e) => set("dev_profile_id", e.target.value)}>
          <option value="">—</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-status">Status</Label>
        <select id="lead-status" className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      {canAssignOwner && (
        <div className="space-y-1.5">
          <Label htmlFor="lead-owner">Owner (BD)</Label>
          <select id="lead-owner" className={selectCls} value={form.owner_bd_id} onChange={(e) => set("owner_bd_id", e.target.value)}>
            <option value="">Me</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="lead-budget">Budget</Label>
        <Input id="lead-budget" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. $5,000–$7,000/mo" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-expected">Expected budget</Label>
        <Input id="lead-expected" value={form.expected_budget} onChange={(e) => set("expected_budget", e.target.value)} placeholder="what we asked for" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-shift">Shift</Label>
        <Input id="lead-shift" value={form.shift} onChange={(e) => set("shift", e.target.value)} placeholder="e.g. US EST · 6pm–2am PKT" />
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>Job description</Label>
        <RichText value={form.job_description} onChange={(html) => set("job_description", html)} placeholder="Paste or type the job description…" />
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>BD notes</Label>
        <p className="text-caption text-text-secondary">Private notepad — HR contact/email, call notes, anything useful for this deal.</p>
        <RichText value={form.notes} onChange={(html) => set("notes", html)} placeholder="e.g. HR: jane@acme.com …" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create lead"}</Button>
      </div>
    </form>
  );
}
