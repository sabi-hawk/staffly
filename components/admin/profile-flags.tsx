"use client";
// Admin toggle for an employee's privileged flags. `is_deal_developer` changes their leave treatment
// (balances hidden, requests record-only) and lets them be assigned to deals.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FLAGS: { key: string; label: string; hint: string }[] = [
  { key: "is_developer", label: "Developer", hint: "Assignable as the interview/assessment/deal developer." },
  { key: "is_bd_lead", label: "BD Lead", hint: "Sees & manages all BDs' CRM data." },
  { key: "is_deal_developer", label: "Deal-assigned developer", hint: "Works a client deal. Leave balances are hidden and leave requests are record-only; the client company governs their leave." },
  { key: "is_closer", label: "Can be a closer", hint: "Eligible to be picked as the closer on a deal (appears in the deal Closer list). Tick anyone who lands deals, not just developers." },
];

export function ProfileFlags({ employeeId, initial }: { employeeId: string; initial: Record<string, boolean> }) {
  const router = useRouter();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    is_developer: !!initial.is_developer,
    is_bd_lead: !!initial.is_bd_lead,
    is_deal_developer: !!initial.is_deal_developer,
    is_closer: !!initial.is_closer,
  });
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/employees/${employeeId}/flags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(flags),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return toast.error(j.error ?? "Failed to save"); }
    toast.success("Flags saved");
    setBusy(false);
    startTransition(() => router.refresh());
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
      <Button size="sm" onClick={save} disabled={busy || pending}>{busy || pending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save flags"}</Button>
    </div>
  );
}
