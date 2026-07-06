"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { RichText } from "@/components/crm/rich-text";
import { labelize, LEAD_STATUS, LEAD_REASON_STATUSES } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

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
      <FloatInput
        id="lead-company"
        label="Company *"
        hint="The client company this opportunity is with."
        required
        value={form.company}
        onChange={(e) => set("company", e.target.value)}
      />
      <FloatInput
        id="lead-role"
        label="Role"
        hint="The position the company is hiring for, e.g. Senior Full Stack."
        value={form.role}
        onChange={(e) => set("role", e.target.value)}
      />
      <FloatSelect
        id="lead-profile"
        label="Profile"
        hint="Which of our marketing dev-profiles we're putting forward for this lead."
        value={form.dev_profile_id}
        onChange={(e) => set("dev_profile_id", e.target.value)}
      >
        <option value="">Not set</option>
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </FloatSelect>
      <FloatSelect
        id="lead-status"
        label="Status"
        hint="Where this lead sits in the pipeline. Rejected and Dismissed are set from the lead page's qualification actions because they need a reason."
        className="capitalize"
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
      </FloatSelect>
      {canAssignOwner && (
        <FloatSelect
          id="lead-owner"
          label="Owner (BD)"
          hint="The BD who owns this lead. Only a BD-Lead or admin can assign it to someone else."
          value={form.owner_bd_id}
          onChange={(e) => set("owner_bd_id", e.target.value)}
        >
          <option value="">Me</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </FloatSelect>
      )}
      <FloatInput
        id="lead-budget"
        label="Budget"
        hint="The budget the company is offering (what they're willing to pay), e.g. $5,000 to $7,000/mo."
        value={form.budget}
        onChange={(e) => set("budget", e.target.value)}
      />
      <FloatInput
        id="lead-expected"
        label="Expected budget"
        hint="The rate we asked for or expect for this role."
        value={form.expected_budget}
        onChange={(e) => set("expected_budget", e.target.value)}
      />
      <FloatInput
        id="lead-shift"
        label="Shift"
        hint="The working hours or timezone for this role, if known in advance. Free text, e.g. US EST, 6pm to 2am PKT."
        value={form.shift}
        onChange={(e) => set("shift", e.target.value)}
      />
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>Job description</Label>
        <RichText value={form.job_description} onChange={(html) => set("job_description", html)} placeholder="Paste or type the job description…" />
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label>BD notes</Label>
        <p className="text-caption text-text-secondary">Private notepad: HR contact and email, call notes, anything useful for this deal.</p>
        <RichText value={form.notes} onChange={(html) => set("notes", html)} placeholder="e.g. HR: jane@acme.com …" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create lead"}</Button>
      </div>
    </form>
  );
}
