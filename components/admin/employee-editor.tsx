"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import type { Profile } from "@/lib/types";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type Field = { key: keyof Profile; label: string; type?: string; options?: string[]; hint: string };

const CORE: Field[] = [
  { key: "full_name", label: "Full name", hint: "The employee's full legal name as it should appear across the portal." },
  { key: "employee_code", label: "Employee code", hint: "The unique staff ID used to identify this employee in records." },
  { key: "email", label: "Email", hint: "The employee's primary work email, used for login and notifications." },
  { key: "email_secondary", label: "Email 2", hint: "An optional backup email address for this employee." },
  { key: "phone", label: "Phone", hint: "The employee's contact phone number." },
  { key: "gender", label: "Gender", type: "select", options: ["", "male", "female"], hint: "The employee's gender. Leave unset if not provided." },
  { key: "date_of_birth", label: "Date of birth", type: "date", hint: "The employee's date of birth." },
  { key: "joining_date", label: "Joining date", type: "date", hint: "The date the employee started at the company." },
  { key: "position", label: "Designation", hint: "The employee's job title or designation." },
  { key: "department", label: "Department", hint: "The department or team this employee belongs to." },
  { key: "employment_type", label: "Work type", type: "select", options: ["onsite", "remote", "hybrid"], hint: "Whether the employee works onsite, remotely, or a mix (hybrid)." },
  { key: "contract_type", label: "Contract", type: "select", options: ["permanent", "probation"], hint: "Whether the employee is permanent or still on probation." },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"], hint: "Active employees can use the portal; inactive ones are blocked from signing in." },
];

export function EmployeeEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fields = CORE;
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ((profile[f.key] as string) ?? "")]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, string | null> = {};
    for (const f of fields) payload[f.key as string] = form[f.key as string] || null;
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Employee updated");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) =>
        f.type === "select" ? (
          <FloatSelect
            key={String(f.key)}
            id={`emp-${String(f.key)}`}
            label={f.label}
            hint={f.hint}
            value={form[f.key as string]}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          >
            {f.options!.map((o) => (
              <option key={o} value={o}>{o ? cap(o) : "Not set"}</option>
            ))}
          </FloatSelect>
        ) : f.type === "date" ? (
          <DatePicker
            key={String(f.key)}
            id={`emp-${String(f.key)}`}
            label={f.label}
            hint={f.hint}
            value={form[f.key as string]}
            onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
          />
        ) : (
          <FloatInput
            key={String(f.key)}
            id={`emp-${String(f.key)}`}
            label={f.label}
            hint={f.hint}
            type={f.type ?? "text"}
            value={form[f.key as string]}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          />
        )
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
