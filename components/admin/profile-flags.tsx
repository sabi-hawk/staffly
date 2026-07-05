"use client";
// Admin toggle for an employee's privileged flags. `is_deal_developer` changes their leave treatment
// (balances hidden, requests record-only) and lets them be assigned to deals.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const FLAGS: { key: string; label: string; hint: string }[] = [
  { key: "is_developer", label: "Developer", hint: "Assignable as the interview/assessment/deal developer." },
  { key: "is_bd_lead", label: "BD Lead", hint: "Sees & manages all BDs' CRM data." },
  { key: "is_deal_developer", label: "Deal-assigned developer", hint: "Works a client deal — leave balances are hidden and leave requests are record-only (client company governs their leave)." },
];

export function ProfileFlags({ employeeId, initial }: { employeeId: string; initial: Record<string, boolean> }) {
  const router = useRouter();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    is_developer: !!initial.is_developer,
    is_bd_lead: !!initial.is_bd_lead,
    is_deal_developer: !!initial.is_deal_developer,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/employees/${employeeId}/flags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(flags),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Failed to save");
    toast.success("Flags saved");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {FLAGS.map((f) => (
        <label key={f.key} className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={flags[f.key]} onChange={(e) => setFlags((s) => ({ ...s, [f.key]: e.target.checked }))} />
          <span>
            <span className="text-sm font-medium text-text-primary">{f.label}</span>
            <span className="block text-caption text-text-secondary">{f.hint}</span>
          </span>
        </label>
      ))}
      <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save flags"}</Button>
    </div>
  );
}
