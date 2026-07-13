"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import type { EmployeePrivate } from "@/lib/types";

type PF = { key: keyof EmployeePrivate; label: string; hint: string };
const CNIC_FIELDS: PF[] = [{ key: "cnic", label: "CNIC", hint: "National identity number. Sensitive PII — visible to the employee and super admin only." }];
const BANK_FIELDS: PF[] = [
  { key: "bank_account_title", label: "Account title", hint: "The name on the bank account (payee)." },
  { key: "bank_account_number", label: "Account number", hint: "The account the salary is paid into." },
  { key: "bank_name", label: "Bank", hint: "The employee's bank." },
  { key: "iban", label: "IBAN", hint: "International account number, if used for transfers." },
];

/** Super-admin editor for sensitive PII (employee_private). `only` renders just CNIC or just the bank
 * fields (they upsert independently — saving one never clears the other). */
export function PrivateEditor({ employeeId, data, only }: { employeeId: string; data: EmployeePrivate | null; only?: "cnic" | "bank" }) {
  const router = useRouter();
  const fields = only === "cnic" ? CNIC_FIELDS : only === "bank" ? BANK_FIELDS : [...CNIC_FIELDS, ...BANK_FIELDS];
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ((data?.[f.key] as string) ?? "")]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, string | null> = { employee_id: employeeId };
    for (const f of fields) payload[f.key as string] = form[f.key as string] || null;
    const supabase = createClient();
    const { error } = await supabase.from("employee_private").upsert(payload, { onConflict: "employee_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <FloatInput
          key={String(f.key)}
          id={`priv-${String(f.key)}`}
          label={f.label}
          hint={f.hint}
          value={form[f.key as string]}
          onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
        />
      ))}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
