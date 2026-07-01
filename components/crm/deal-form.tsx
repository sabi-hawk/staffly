"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Opt } from "@/lib/crm/options";

const selectCls = "h-9 w-full rounded-md border border-border bg-white px-3 text-sm";
const STATUSES = ["active", "ended", "cancelled"];

export function DealForm({
  id,
  leads,
  profiles,
  developers,
  accounts,
  methods,
  initial,
}: {
  id?: string;
  leads: Opt[];
  profiles: Opt[];
  developers: Opt[];
  accounts: Opt[];
  methods: Opt[];
  initial?: Partial<Record<string, string | null>>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    lead_id: initial?.lead_id ?? "",
    dev_profile_id: initial?.dev_profile_id ?? "",
    working_developer: initial?.working_developer ?? "",
    designation: initial?.designation ?? "",
    joining_date: initial?.joining_date ?? "",
    salary: initial?.salary ?? "",
    receiving_account_id: initial?.receiving_account_id ?? "",
    payment_method_id: initial?.payment_method_id ?? "",
    profile_dob: initial?.profile_dob ?? "",
    status: initial?.status ?? "active",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(id ? `/api/crm/deals/${id}` : "/api/crm/deals", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(id ? "Deal saved" : "Deal created");
    router.push(id ? `/crm/deals/${id}` : `/crm/deals/${json.id}`);
    router.refresh();
  }

  const sel = (k: string, label: string, opts: Opt[], first = "—") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className={selectCls} value={form[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">{first}</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sel("lead_id", "Lead", leads)}
      {sel("dev_profile_id", "Selected profile", profiles)}
      {sel("working_developer", "Working developer", developers)}
      <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation} onChange={(e) => set("designation", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Joining date</Label><Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Salary (PKR)</Label><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></div>
      {sel("receiving_account_id", "Receiving account", accounts)}
      {sel("payment_method_id", "Payment method", methods)}
      <div className="space-y-1.5"><Label>Profile DOB</Label><Input type="date" value={form.profile_dob} onChange={(e) => set("profile_dob", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select className={`${selectCls} capitalize`} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save deal" : "Create deal"}</Button>
      </div>
    </form>
  );
}
