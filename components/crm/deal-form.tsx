"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import type { Opt } from "@/lib/crm/options";

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
    name: initial?.name ?? "",
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

  const sel = (k: string, label: string, opts: Opt[], hint: string, first = "Not set") => (
    <FloatSelect id={`deal-${k}`} label={label} hint={hint} value={form[k]} onChange={(e) => set(k, e.target.value)}>
      <option value="">{first}</option>
      {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </FloatSelect>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FloatInput
        id="deal-name"
        label="Deal name"
        hint="A recognisable name for this deal, e.g. Acme Senior FS. Shown in deal lists and reports."
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />
      {sel("lead_id", "Lead", leads, "The CRM lead this deal was closed from. Links the deal back to its pipeline history.")}
      {sel("dev_profile_id", "Selected profile", profiles, "The marketing profile the client hired. Kept for reference in client-facing conversations.")}
      {sel("working_developer", "Working developer", developers, "The employee actually doing the work, which may differ from the profile presented to the client.")}
      <FloatInput
        id="deal-designation"
        label="Designation"
        hint="The role title the client hired for, e.g. Senior Full Stack Engineer."
        value={form.designation}
        onChange={(e) => set("designation", e.target.value)}
      />
      <DatePicker
        id="deal-joining_date"
        label="Joining date"
        hint="The date the developer starts (or started) working with the client."
        value={form.joining_date}
        onChange={(v) => set("joining_date", v)}
      />
      <FloatInput
        id="deal-salary"
        label="Salary (PKR)"
        hint="The monthly amount for this deal in PKR. Deal financials are visible to super admins only."
        type="number"
        value={form.salary}
        onChange={(e) => set("salary", e.target.value)}
      />
      {sel("receiving_account_id", "Receiving account", accounts, "The account where the client's payments for this deal arrive.")}
      {sel("payment_method_id", "Payment method", methods, "How the client pays for this deal, e.g. Wise or Payoneer.")}
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
        className="capitalize"
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </FloatSelect>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save deal" : "Create deal"}</Button>
      </div>
    </form>
  );
}
