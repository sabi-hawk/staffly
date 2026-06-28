"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { EmployeePrivate } from "@/lib/types";

const FIELDS: { key: keyof EmployeePrivate; label: string }[] = [
  { key: "cnic", label: "CNIC" },
  { key: "bank_account_title", label: "Account title" },
  { key: "bank_account_number", label: "Account number" },
  { key: "bank_name", label: "Bank" },
  { key: "iban", label: "IBAN" },
];

/** Super-admin editor for sensitive PII (employee_private). */
export function PrivateEditor({ employeeId, data }: { employeeId: string; data: EmployeePrivate | null }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, ((data?.[f.key] as string) ?? "")]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, string | null> = { employee_id: employeeId };
    for (const f of FIELDS) payload[f.key as string] = form[f.key as string] || null;
    const supabase = createClient();
    const { error } = await supabase.from("employee_private").upsert(payload, { onConflict: "employee_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Private details updated");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map((f) => (
        <div key={String(f.key)} className="space-y-1.5">
          <Label>{f.label}</Label>
          <Input value={form[f.key as string]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save private details"}</Button>
      </div>
    </form>
  );
}
