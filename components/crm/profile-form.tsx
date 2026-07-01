"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type Opt = { id: string; label: string };

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";

export function ProfileForm({
  id,
  stacks,
  owners,
  initial,
}: {
  id?: string;
  stacks: Opt[];
  owners: Opt[];
  initial?: Partial<Record<string, string | null>>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    name: initial?.name ?? "",
    stack_id: initial?.stack_id ?? "",
    owner_bd_id: initial?.owner_bd_id ?? "",
    email: initial?.email ?? "",
    mobile: initial?.mobile ?? "",
    dob: initial?.dob ?? "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(id ? `/api/crm/profiles/${id}` : "/api/crm/profiles", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(id ? "Profile saved" : "Profile created");
    router.push(id ? `/crm/profiles/${id}` : `/crm/profiles/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Stack</Label>
        <select className={selectCls} value={form.stack_id} onChange={(e) => set("stack_id", e.target.value)}>
          <option value="">—</option>
          {stacks.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Owner (BD)</Label>
        <select className={selectCls} value={form.owner_bd_id} onChange={(e) => set("owner_bd_id", e.target.value)}>
          <option value="">Unassigned</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Mobile</Label>
        <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Date of birth</Label>
        <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notes (e.g. &quot;LinkedIn banned&quot;)</Label>
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save profile" : "Create profile"}</Button>
      </div>
    </form>
  );
}
