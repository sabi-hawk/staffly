"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Opt } from "@/lib/crm/options";

export type { Opt }; // re-export for existing importers

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
    stack: initial?.stack ?? "", // stack NAME (pick from the datalist or type a new one)
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
        <Label htmlFor="profile-name">Name *</Label>
        <Input id="profile-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-stack">Stack</Label>
        {/* pick an existing stack or type a new one (created on save) */}
        <Input
          id="profile-stack"
          list="profile-stack-options"
          value={form.stack}
          onChange={(e) => set("stack", e.target.value)}
          placeholder="Pick or type a stack…"
        />
        <datalist id="profile-stack-options">
          {stacks.map((s) => <option key={s.id} value={s.label} />)}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-owner">Owner (BD)</Label>
        <select id="profile-owner" className={selectCls} value={form.owner_bd_id} onChange={(e) => set("owner_bd_id", e.target.value)}>
          <option value="">Unassigned</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-mobile">Mobile</Label>
        <Input id="profile-mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-dob">Date of birth</Label>
        <Input id="profile-dob" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-status">Status</Label>
        <select id="profile-status" className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="profile-notes">Notes (e.g. &quot;LinkedIn banned&quot;)</Label>
        <Input id="profile-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save profile" : "Create profile"}</Button>
      </div>
    </form>
  );
}
