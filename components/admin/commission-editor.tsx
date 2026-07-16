"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCrmDate } from "@/lib/utils";
import { companyToday } from "@/lib/time";
import type { CommissionPolicy } from "@/lib/types";

/** Super-admin editor for a BD employee's commission policies (percentage commitments). */
export function CommissionEditor({ employeeId, policies }: { employeeId: string; policies: CommissionPolicy[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [rate, setRate] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(companyToday());
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !rate) return toast.error("Label and rate required");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("commission_policies").insert({
      employee_id: employeeId, label, rate: Number(rate), description: description || null,
      effective_date: effectiveDate || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Policy added");
    setLabel(""); setRate(""); setDescription(""); setEffectiveDate(companyToday());
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("commission_policies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {policies.length === 0 && <p className="text-caption text-text-secondary">No commission policies yet.</p>}
        {policies.map((c) => (
          <div key={c.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div>
              <span className="font-medium text-text-primary">{c.label}</span>
              {c.effective_date && <span className="ml-2 text-caption text-text-secondary">from {formatCrmDate(c.effective_date)}</span>}
              {c.description && <p className="text-caption text-text-secondary">{c.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular font-semibold text-text-primary">{c.rate}%</span>
              <button onClick={() => remove(c.id)} className="text-text-secondary hover:text-danger" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
        <FloatInput id="cp-label" label="Policy" hint="A name for this commitment, e.g. Own deals, Junior deals." value={label} onChange={(e) => setLabel(e.target.value)} />
        <FloatInput id="cp-rate" label="Rate (%)" hint="The percentage this policy commits to." type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
        <DatePicker id="cp-effective" label="Effective from" hint="The date this policy takes effect. If the rate changed, add a new policy with a later date; earlier ones stay for history." value={effectiveDate} onChange={setEffectiveDate} />
        <FloatInput id="cp-desc" label="Description (optional)" hint="What it applies to." value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}><Plus className="size-4" /> Add policy</Button>
        </div>
      </form>
    </div>
  );
}
