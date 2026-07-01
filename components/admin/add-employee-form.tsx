"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const FIELDS: { key: string; label: string; type?: string; options?: string[]; required?: boolean }[] = [
  { key: "full_name", label: "Full name", required: true },
  { key: "email", label: "Email (login)", type: "email", required: true },
  { key: "email_secondary", label: "Email 2" },
  { key: "phone", label: "Phone" },
  { key: "cnic", label: "CNIC" },
  { key: "gender", label: "Gender", type: "select", options: ["", "male", "female"] },
  { key: "position", label: "Designation" },
  { key: "department", label: "Department" },
  { key: "employment_type", label: "Work type", type: "select", options: ["onsite", "remote"] },
  { key: "contract_type", label: "Contract", type: "select", options: ["permanent", "probation"] },
  { key: "joining_date", label: "Joining date", type: "date" },
  { key: "base_salary", label: "Base salary (PKR) — 0 for commission-only", type: "number" },
];

export function AddEmployeeForm() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({ employment_type: "onsite", contract_type: "permanent" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to create employee");
    toast.success(`Created — username ${json.username} · password ${json.password}`);
    router.push(`/admin/employees/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}{f.required ? " *" : ""}</Label>
          {f.type === "select" ? (
            <select
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm capitalize"
            >
              {f.options!.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
            </select>
          ) : (
            <Input
              type={f.type ?? "text"}
              required={f.required}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create employee"}</Button>
        <span className="text-caption text-text-secondary">A username & password (Softonoma@&lt;code&gt;) are generated automatically.</span>
      </div>
    </form>
  );
}
