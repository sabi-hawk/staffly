"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";

const FIELDS: { key: string; label: string; hint: string; type?: string; options?: string[]; required?: boolean }[] = [
  { key: "full_name", label: "Full name", hint: "The employee's legal full name, shown across the portal.", required: true },
  { key: "email", label: "Email (login)", hint: "The work email the employee signs in with. A username is generated from it.", type: "email", required: true },
  { key: "email_secondary", label: "Email 2", hint: "An optional personal or backup email address." },
  { key: "phone", label: "Phone", hint: "Contact phone number." },
  { key: "cnic", label: "CNIC", hint: "National identity card number. Stored privately; only the employee and super admin can see it." },
  { key: "gender", label: "Gender", hint: "Optional; shown on the employee profile.", type: "select", options: ["", "male", "female"] },
  { key: "position", label: "Designation", hint: "Job title, e.g. Software Engineer." },
  { key: "department", label: "Department", hint: "The team the employee belongs to." },
  { key: "employment_type", label: "Work type", hint: "Whether the employee works onsite or remotely.", type: "select", options: ["onsite", "remote"] },
  { key: "contract_type", label: "Contract", hint: "Probation staff follow reduced leave rules until confirmed permanent.", type: "select", options: ["permanent", "probation"] },
  { key: "joining_date", label: "Joining date", hint: "First working day. Drives leave accrual and payroll.", type: "date" },
  { key: "base_salary", label: "Base salary (PKR)", hint: "Monthly base pay in PKR. Enter 0 for commission-only staff.", type: "number" },
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
    toast.success(`Created. Username ${json.username} · password ${json.password}`);
    router.push(`/admin/employees/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map((f) =>
        f.type === "select" ? (
          <FloatSelect
            key={f.key}
            id={`new-emp-${f.key}`}
            label={`${f.label}${f.required ? " *" : ""}`}
            hint={f.hint}
            value={form[f.key] ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            className="capitalize"
          >
            {f.options!.map((o) => <option key={o} value={o}>{o || "Not set"}</option>)}
          </FloatSelect>
        ) : f.type === "date" ? (
          <DatePicker
            key={f.key}
            id={`new-emp-${f.key}`}
            label={`${f.label}${f.required ? " *" : ""}`}
            hint={f.hint}
            value={form[f.key] ?? ""}
            onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
          />
        ) : (
          <FloatInput
            key={f.key}
            id={`new-emp-${f.key}`}
            label={`${f.label}${f.required ? " *" : ""}`}
            hint={f.hint}
            type={f.type ?? "text"}
            required={f.required}
            value={form[f.key] ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          />
        )
      )}
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create employee"}</Button>
        <span className="text-caption text-text-secondary">A username & password (Softonoma@&lt;code&gt;) are generated automatically.</span>
      </div>
    </form>
  );
}
