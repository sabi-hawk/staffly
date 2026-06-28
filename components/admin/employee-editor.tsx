"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Profile } from "@/lib/types";

type Field = { key: keyof Profile; label: string; type?: string; options?: string[] };

const CORE: Field[] = [
  { key: "full_name", label: "Full name" },
  { key: "employee_code", label: "Employee code" },
  { key: "email", label: "Email" },
  { key: "email_secondary", label: "Email 2" },
  { key: "phone", label: "Phone" },
  { key: "gender", label: "Gender", type: "select", options: ["", "male", "female"] },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "joining_date", label: "Joining date", type: "date" },
  { key: "position", label: "Designation" },
  { key: "department", label: "Department" },
  { key: "employment_type", label: "Type", type: "select", options: ["onsite", "remote"] },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
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
      {fields.map((f) => (
        <div key={String(f.key)} className="space-y-1.5">
          <Label>{f.label}</Label>
          {f.type === "select" ? (
            <select
              value={form[f.key as string]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm capitalize"
            >
              {f.options!.map((o) => (
                <option key={o} value={o}>{o || "—"}</option>
              ))}
            </select>
          ) : (
            <Input
              type={f.type ?? "text"}
              value={form[f.key as string]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
