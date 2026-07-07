"use client";
// The lead's top card. View mode shows the key fields; clicking Edit makes THIS SAME section editable
// in place (no modal) — company, role, profile, status, budget, expected. Owner is only editable by a
// BD-Lead/admin. Rejected/Dismissed are excluded here (set with a reason in the Qualification section).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { StatusPill } from "@/components/crm/status-pill";
import { LEAD_HINTS } from "@/lib/crm/field-hints";
import { labelize, LEAD_STATUS, LEAD_REASON_STATUSES } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

const MANUAL_STATUSES = LEAD_STATUS.filter((s) => !(LEAD_REASON_STATUSES as readonly string[]).includes(s));

type Initial = {
  company: string; role: string | null; dev_profile_id: string | null; status: string;
  owner_bd_id: string | null; budget: string | null; expected_budget: string | null; shift: string | null;
};

export function LeadDetailsCard({
  leadId, initial, profileName, ownerName, profiles, owners, canAssignOwner, canCreateDeal,
}: {
  leadId: string;
  initial: Initial;
  profileName: string;
  ownerName: string;
  profiles: Opt[];
  owners: Opt[];
  canAssignOwner: boolean;
  canCreateDeal: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    company: initial.company ?? "",
    role: initial.role ?? "",
    dev_profile_id: initial.dev_profile_id ?? "",
    status: initial.status ?? "in_progress",
    owner_bd_id: initial.owner_bd_id ?? "",
    budget: initial.budget ?? "",
    expected_budget: initial.expected_budget ?? "",
    shift: initial.shift ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  function cancel() {
    setForm({
      company: initial.company ?? "", role: initial.role ?? "", dev_profile_id: initial.dev_profile_id ?? "",
      status: initial.status ?? "in_progress", owner_bd_id: initial.owner_bd_id ?? "",
      budget: initial.budget ?? "", expected_budget: initial.expected_budget ?? "", shift: initial.shift ?? "",
    });
    setEditing(false);
  }

  async function save() {
    if (!form.company.trim()) return toast.error("Company is required");
    setBusy(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success("Lead saved");
    setEditing(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle>{editing ? "Edit lead" : `${form.company}${initial.role ? ` · ${initial.role}` : ""}`}</CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {!editing && <StatusPill status={initial.status} />}
          {!editing && canCreateDeal && (
            <Button asChild size="sm" variant="outline"><Link href={`/crm/deals/new?lead=${leadId}`}>Create deal</Link></Button>
          )}
          {editing ? (
            <Button size="sm" variant="outline" onClick={cancel} aria-label="Cancel"><X className="size-4" /> Cancel</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label="Edit lead"><Pencil className="size-3.5" /> Edit</Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FloatInput id="ld-company" label="Company *" hint={LEAD_HINTS.company} required value={form.company} onChange={(e) => set("company", e.target.value)} />
            <FloatInput id="ld-role" label="Role" hint={LEAD_HINTS.role} value={form.role} onChange={(e) => set("role", e.target.value)} />
            <FloatSelect id="ld-profile" label="Profile" hint={LEAD_HINTS.profile} value={form.dev_profile_id} onChange={(e) => set("dev_profile_id", e.target.value)}>
              <option value="">Not set</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </FloatSelect>
            <FloatSelect id="ld-status" label="Status" hint={LEAD_HINTS.status} className="capitalize" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
            </FloatSelect>
            {canAssignOwner && (
              <FloatSelect id="ld-owner" label="Owner (BD)" hint={LEAD_HINTS.owner} value={form.owner_bd_id} onChange={(e) => set("owner_bd_id", e.target.value)}>
                <option value="">Me</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </FloatSelect>
            )}
            <FloatInput id="ld-budget" label="Budget" hint={LEAD_HINTS.budget} value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            <FloatInput id="ld-expected" label="Expected budget" hint={LEAD_HINTS.expected_budget} value={form.expected_budget} onChange={(e) => set("expected_budget", e.target.value)} />
            <FloatInput id="ld-shift" label="Shift" hint={LEAD_HINTS.shift} value={form.shift} onChange={(e) => set("shift", e.target.value)} />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-caption text-text-secondary">Profile</dt><dd>{profileName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Owner (BD)</dt><dd>{ownerName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Budget</dt><dd>{initial.budget || "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Expected</dt><dd>{initial.expected_budget || "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Shift</dt><dd>{initial.shift || "—"}</dd></div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
