"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect, FloatShell } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { CURRENCIES } from "@/lib/utils";
import type { Opt } from "@/lib/crm/options";

const toOpts = (arr: Opt[]) => arr.map((o) => ({ value: o.id, label: o.label, sublabel: o.sublabel, color: o.color }));

const STATUSES = ["active", "ended", "cancelled"];

export function DealForm({
  id,
  leads,
  profiles,
  developers,
  bds = [],
  accounts,
  methods,
  initial,
  initialDevelopers = [],
}: {
  id?: string;
  leads: Opt[];
  profiles: Opt[];
  developers: Opt[];
  bds?: Opt[];
  accounts: Opt[];
  methods: Opt[];
  initial?: Partial<Record<string, string | null>>;
  initialDevelopers?: string[];
}) {
  const router = useRouter();
  const [workingDevs, setWorkingDevs] = useState<string[]>(initialDevelopers);
  const [form, setForm] = useState<Record<string, string>>({
    name: initial?.name ?? "",
    lead_id: initial?.lead_id ?? "",
    dev_profile_id: initial?.dev_profile_id ?? "",
    working_developer: initial?.working_developer ?? "",
    closer_id: initial?.closer_id ?? "",
    owner_bd_id: initial?.owner_bd_id ?? "",
    currency: initial?.currency ?? "PKR",
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
      body: JSON.stringify({ ...form, developers: workingDevs }),
    });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return toast.error(json.error ?? "Failed to save"); }
    toast.success(id ? "Deal saved" : "Deal created");
    // keep the button loading through the navigation (no dead gap after the toast)
    router.push(id ? `/crm/deals/${id}` : `/crm/deals/${json.id}`);
    router.refresh();
  }

  const Divider = ({ title }: { title: string }) => (
    <div className="col-span-full mt-2 flex items-center gap-3">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{title}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* ── The deal (client-facing) ─────────────────────────────────────────── */}
      <Divider title="Deal" />
      <FloatInput
        id="deal-name"
        label="Company name"
        hint="The client company for this deal. A company can have several deals (each gets its own code)."
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <FloatInput
        id="deal-designation"
        label="Designation"
        hint="The role title the client hired for, e.g. Senior Full Stack Engineer."
        value={form.designation}
        onChange={(e) => set("designation", e.target.value)}
      />
      {/* merged amount + currency */}
      <FloatShell label="Amount" hint="The monthly amount for this deal, in the chosen currency. Receipts you log later are still recorded in PKR (what actually landed). Super-admin only." filled htmlFor="deal-salary" className="h-10">
        <div className="flex h-10 items-center rounded-md border border-border bg-white transition-colors focus-within:ring-2 focus-within:ring-brand-primary">
          <select
            aria-label="Currency"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
            className="h-full appearance-none rounded-l-md border-r border-border bg-surface/60 pl-2.5 pr-6 text-sm font-medium text-text-primary focus:outline-none"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            id="deal-salary"
            type="number"
            value={form.salary}
            onChange={(e) => set("salary", e.target.value)}
            className="h-full w-full flex-1 rounded-r-md bg-transparent px-3 text-sm text-text-primary focus:outline-none"
          />
        </div>
      </FloatShell>
      <DatePicker
        id="deal-joining_date"
        label="Joining date"
        hint="The date the developer starts (or started) working with the client."
        value={form.joining_date}
        onChange={(v) => set("joining_date", v)}
      />

      {/* ── People (internal) ────────────────────────────────────────────────── */}
      <Divider title="People" />
      <Combobox id="deal-dev_profile_id" label="Selected profile" hint="The marketing profile the client hired. Search by number, name, stack or email." options={toOpts(profiles)} value={form.dev_profile_id} onChange={(v) => set("dev_profile_id", v)} searchPlaceholder="Search profiles…" />
      <Combobox id="deal-closer_id" label="Closer" hint="Who closed this deal. Always record who landed it." options={toOpts(developers)} value={form.closer_id} onChange={(v) => set("closer_id", v)} searchPlaceholder="Search people…" />
      <Combobox id="deal-owner_bd_id" label="BD owner (optional)" hint="The BD who owns this deal." options={toOpts(bds)} value={form.owner_bd_id} onChange={(v) => set("owner_bd_id", v)} searchPlaceholder="Search BDs…" />
      <Combobox id="deal-working_developers" label="Working developers (optional)" hint="Everyone doing the work on this deal — pick one or more. May differ from the closer." options={toOpts(developers)} value={workingDevs} onChange={setWorkingDevs} multiple searchPlaceholder="Search people…" />

      {/* ── Other ────────────────────────────────────────────────────────────── */}
      <Divider title="Other" />
      <Combobox id="deal-lead_id" label="Lead (optional)" hint="The CRM lead this deal came from, if any. Deals can exist without a lead." options={toOpts(leads)} value={form.lead_id} onChange={(v) => set("lead_id", v)} searchPlaceholder="Search leads…" />
      <DatePicker
        id="deal-profile_dob"
        label="Profile DOB"
        hint="The date of birth on the hired profile's persona, kept handy for client paperwork."
        value={form.profile_dob}
        onChange={(v) => set("profile_dob", v)}
      />
      <FloatSelect
        id="deal-status"
        label="Status"
        hint="Active means the engagement is running. Ended or cancelled deals stay here for history."
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </FloatSelect>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save deal" : "Create deal"}</Button>
      </div>
    </form>
  );
}
