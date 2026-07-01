"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { labelize, LEAD_STATUS } from "@/lib/crm/constants";
import type { Opt } from "@/lib/crm/options";

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";
// 'disqualified' is set via the disqualify action, not the manual status dropdown.
const MANUAL_STATUSES = LEAD_STATUS.filter((s) => s !== "disqualified");

export function LeadForm({
  id,
  profiles,
  owners,
  canAssignOwner,
  initial,
}: {
  id?: string;
  profiles: Opt[];
  owners: Opt[];
  canAssignOwner: boolean;
  initial?: Partial<Record<string, string | null>>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    dev_profile_id: initial?.dev_profile_id ?? "",
    status: initial?.status ?? "open",
    owner_bd_id: initial?.owner_bd_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(id ? `/api/crm/leads/${id}` : "/api/crm/leads", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(id ? "Lead saved" : "Lead created");
    router.push(id ? `/crm/leads/${id}` : `/crm/leads/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Company *</Label>
        <Input required value={form.company} onChange={(e) => set("company", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Senior Full Stack" />
      </div>
      <div className="space-y-1.5">
        <Label>Profile</Label>
        <select className={selectCls} value={form.dev_profile_id} onChange={(e) => set("dev_profile_id", e.target.value)}>
          <option value="">—</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
        </select>
      </div>
      {canAssignOwner && (
        <div className="space-y-1.5">
          <Label>Owner (BD)</Label>
          <select className={selectCls} value={form.owner_bd_id} onChange={(e) => set("owner_bd_id", e.target.value)}>
            <option value="">Me</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save lead" : "Create lead"}</Button>
      </div>
    </form>
  );
}
