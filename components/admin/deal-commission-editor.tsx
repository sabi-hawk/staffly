"use client";
// Super-admin editor for a BD's deal commissions. Each line ties the BD to a deal and pays either a
// percentage of that deal's receipts (billed to the payroll period) or a one-off fixed amount. On the
// payslip the BD sees only "Commission — {Company}: amount"; the admin sees the rate/total breakdown.
// Writes via the RLS-guarded browser client (deal_commissions = compensation.manage).
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { ProfileCell } from "@/components/crm/crm-cells";
import { formatPKR, cn } from "@/lib/utils";

// A pulsing placeholder shown while the just-saved row is being refetched (no more "it appears seconds later").
function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-md border border-border px-3 py-2.5">
      <div className="h-3.5 w-40 rounded bg-surface" />
      <div className="mt-2 h-2.5 w-24 rounded bg-surface" />
    </div>
  );
}

type ProfileLite = { id?: string; name?: string | null; profile_no?: number | null; email?: string | null; color?: string | null; stack?: { name?: string | null; color?: string | null } | null };
export type DealCommission = {
  id: string;
  deal_id: string;
  rate: number | null;
  fixed_amount: number | null;
  label: string | null;
  deal?: { name: string | null; deal_code?: number | null; designation?: string | null; owner_bd_id?: string | null; secondary_owner_bd_id?: string | null; closer_id?: string | null; lead?: { company: string | null } | null; profile?: ProfileLite | null } | null;
};

// This employee's role on the deal the commission is tied to: the direct BD owner, the senior/lead who
// also earns on it, the person who closed it, or a working member.
function dealRole(c: DealCommission, employeeId: string): "Primary" | "Secondary" | "Closer" | null {
  if (c.deal?.owner_bd_id === employeeId) return "Primary";
  if (c.deal?.secondary_owner_bd_id === employeeId) return "Secondary";
  if (c.deal?.closer_id === employeeId) return "Closer";
  return null;
}
const ROLE_STYLE: Record<string, string> = {
  Primary: "bg-emerald-100 text-emerald-700",
  Secondary: "bg-violet-100 text-violet-700",
  Closer: "bg-sky-100 text-sky-700",
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Keep the busy / row spinners on until the refetched props arrive, so there's a continuous loading
  // signal (button + skeleton) instead of the new row silently popping in a second later.
  useEffect(() => { if (!pending) { setBusy(false); setRemovingId(null); } }, [pending]);

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
    if (error) { setBusy(false); return toast.error(error.message); }
    toast.success("Commission added");
    setDealId(""); setRate(""); setFixed(""); setLabel(""); setBasis("rate");
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("deal_commissions").delete().eq("id", id);
    if (error) { setRemovingId(null); return toast.error(error.message); }
    toast.success("Removed");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {commissions.length === 0 && !pending && <p className="text-caption text-text-secondary">No deal commissions yet.</p>}
        {commissions.map((c) => {
          const role = dealRole(c, employeeId);
          return (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-text-primary">{c.label || dealName(c)}</span>
                  <span className="font-mono text-caption text-text-secondary">{c.deal?.deal_code ? `#${c.deal.deal_code}` : ""}</span>
                  {role && <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", ROLE_STYLE[role])}>{role}</span>}
                  {c.deal?.designation && <span className="truncate text-caption text-text-secondary">· {c.deal.designation}</span>}
                </div>
                {c.deal?.profile
                  ? <ProfileCell p={c.deal.profile as any} href={c.deal.profile.id ? `/crm/profiles/${c.deal.profile.id}` : undefined} />
                  : <span className="text-caption text-text-secondary">{c.rate != null ? "% of monthly receipts" : "fixed one-off"}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", c.rate != null ? "bg-brand-primary/10 text-brand-primary" : "bg-amber-100 text-amber-700")}>
                  {c.rate != null ? `${c.rate}%` : formatPKR(c.fixed_amount ?? 0)}
                </span>
                <button onClick={() => remove(c.id)} disabled={removingId === c.id} className="text-text-secondary hover:text-danger disabled:opacity-40" aria-label="Remove">
                  {removingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </div>
            </div>
          );
        })}
        {pending && <SkeletonRow />}
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
          <Button type="submit" disabled={busy || pending}>{busy || pending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Plus className="size-4" /> Add commission</>}</Button>
        </form>
      )}
    </div>
  );
}
