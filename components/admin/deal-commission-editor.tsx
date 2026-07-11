"use client";
// Super-admin editor for a BD's deal commissions. Each line ties the BD to a deal and pays either a
// percentage of that deal's receipts (billed to the payroll period) or a one-off fixed amount. On the
// payslip the BD sees only "Commission — {Company}: amount"; the admin sees the rate/total breakdown.
// Writes via the RLS-guarded browser client (deal_commissions = compensation.manage).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";

export type DealCommission = {
  id: string;
  deal_id: string;
  rate: number | null;
  fixed_amount: number | null;
  label: string | null;
  deal?: { name: string | null; lead?: { company: string | null } | null } | null;
};

type DealOpt = { id: string; label: string };

const dealName = (c: DealCommission) => c.deal?.name || c.deal?.lead?.company || "Deal";

export function DealCommissionEditor({
  employeeId,
  commissions,
  deals,
}: {
  employeeId: string;
  commissions: DealCommission[];
  deals: DealOpt[];
}) {
  const router = useRouter();
  const [dealId, setDealId] = useState("");
  const [basis, setBasis] = useState<"rate" | "fixed">("rate");
  const [rate, setRate] = useState("");
  const [fixed, setFixed] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId) return toast.error("Pick a deal");
    if (basis === "rate" && !rate) return toast.error("Enter a rate");
    if (basis === "fixed" && !fixed) return toast.error("Enter an amount");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("deal_commissions").insert({
      employee_id: employeeId,
      deal_id: dealId,
      rate: basis === "rate" ? Number(rate) : null,
      fixed_amount: basis === "fixed" ? Number(fixed) : null,
      label: label || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Commission added");
    setDealId(""); setRate(""); setFixed(""); setLabel(""); setBasis("rate");
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("deal_commissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {commissions.length === 0 && <p className="text-caption text-text-secondary">No deal commissions yet.</p>}
        {commissions.map((c) => (
          <div key={c.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{c.label || dealName(c)}</span>
                {c.rate != null
                  ? <Badge tone="brand">{c.rate}% of receipts</Badge>
                  : <Badge tone="warning">Fixed {formatPKR(c.fixed_amount ?? 0)}</Badge>}
              </div>
              <p className="text-caption text-text-secondary">Deal: {dealName(c)}</p>
            </div>
            <button onClick={() => remove(c.id)} className="text-text-secondary hover:text-danger" aria-label="Remove"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>

      {deals.length === 0 ? (
        <p className="text-caption text-text-secondary">No deals exist yet. Create a deal under CRM → Deals, then assign its commission here.</p>
      ) : (
        <form onSubmit={add} className="space-y-3 rounded-md border border-dashed border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatSelect id="dc-deal" label="Deal" hint="Which deal this BD earns a commission on." value={dealId} onChange={(e) => setDealId(e.target.value)}>
              <option value="">Pick a deal…</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </FloatSelect>
            <FloatSelect id="dc-basis" label="Basis" hint="Percentage of the deal's receipts in the payroll month, or a flat one-off amount." value={basis} onChange={(e) => setBasis(e.target.value as "rate" | "fixed")}>
              <option value="rate">Percentage of receipts</option>
              <option value="fixed">Fixed amount</option>
            </FloatSelect>
            {basis === "rate"
              ? <FloatInput id="dc-rate" label="Rate (%)" hint="e.g. 2 = 2% of what this deal paid in the billing month." type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              : <FloatInput id="dc-fixed" label="Fixed amount (PKR)" hint="A flat commission added regardless of receipts." type="number" value={fixed} onChange={(e) => setFixed(e.target.value)} />}
            <FloatInput id="dc-label" label="Label (optional)" hint="Overrides the payslip label. Default is 'Commission — {company}'." value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <p className="text-caption text-text-secondary">
            On the payslip the BD sees only the label and the amount. You (admin) also see the rate and total received.
          </p>
          <Button type="submit" disabled={busy}><Plus className="size-4" /> Add commission</Button>
        </form>
      )}
    </div>
  );
}
