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

// `private: true` = stored in employee_private (super-admin/self PII), not on profiles. It's shown
// inline here for convenience but only to a super admin, and saved to the private table separately.
type Field = { key: string; label: string; type?: string; options?: string[]; hint: string; private?: boolean };

const CORE: Field[] = [
  { key: "full_name", label: "Full name", hint: "The employee's full legal name as it should appear across the portal." },
  { key: "employee_code", label: "Employee code", hint: "The unique staff ID used to identify this employee in records." },
  { key: "email", label: "Email", hint: "The employee's primary work email, used for login and notifications." },
  { key: "email_secondary", label: "Email 2", hint: "An optional backup email address for this employee." },
  { key: "phone", label: "Phone", hint: "The employee's contact phone number." },
  { key: "cnic", label: "CNIC", hint: "National identity number. Sensitive PII — stored privately and visible to the employee and super admin only.", private: true },
  { key: "gender", label: "Gender", type: "select", options: ["", "male", "female"], hint: "The employee's gender. Leave unset if not provided." },
  { key: "date_of_birth", label: "Date of birth", type: "date", hint: "The employee's date of birth." },
  { key: "joining_date", label: "Joining date", type: "date", hint: "The date the employee started at the company." },
  { key: "position", label: "Designation", hint: "The employee's job title or designation." },
  { key: "department", label: "Department", hint: "The department or team this employee belongs to." },
  { key: "employment_type", label: "Work type", type: "select", options: ["onsite", "remote", "hybrid"], hint: "Whether the employee works onsite, remotely, or a mix (hybrid)." },
  { key: "contract_type", label: "Contract", type: "select", options: ["permanent", "probation"], hint: "Whether the employee is permanent or still on probation." },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"], hint: "Active employees can use the portal; inactive ones are blocked from signing in." },
];

export function EmployeeEditor({ profile, cnic, canEditPrivate = false }: { profile: Profile; cnic?: string | null; canEditPrivate?: boolean }) {
  const router = useRouter();
  // Private fields (CNIC) only render + save for a super admin; hidden for admin/HR (RLS also blocks).
  const fields = CORE.filter((f) => !f.private || canEditPrivate);
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, (f.private ? (cnic ?? "") : (((profile as unknown as Record<string, unknown>)[f.key] as string) ?? ""))]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const payload: Record<string, string | null> = {};
    for (const f of fields) if (!f.private) payload[f.key] = form[f.key] || null;
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    // CNIC lives in employee_private — upsert it separately (only when a super admin edited it).
    let privErr = null;
    if (canEditPrivate) {
      const res = await supabase.from("employee_private").upsert({ employee_id: profile.id, cnic: form.cnic || null }, { onConflict: "employee_id" });
      privErr = res.error;
    }
    setBusy(false);
    if (error || privErr) return toast.error((error ?? privErr)!.message);
    toast.success("Employee updated");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) =>
        f.type === "select" ? (
          <FloatSelect
            key={f.key}
            id={`emp-${f.key}`}
            label={f.label}
            hint={f.hint}
            value={form[f.key]}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          >
            {f.options!.map((o) => (
              <option key={o} value={o}>{o ? cap(o) : "Not set"}</option>
            ))}
          </FloatSelect>
        ) : f.type === "date" ? (
          <DatePicker
            key={f.key}
            id={`emp-${f.key}`}
            label={f.label}
            hint={f.hint}
            value={form[f.key]}
            onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
          />
        ) : (
          <FloatInput
            key={f.key}
            id={`emp-${f.key}`}
            label={f.label}
            hint={f.hint}
            type={f.type ?? "text"}
            value={form[f.key]}
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
