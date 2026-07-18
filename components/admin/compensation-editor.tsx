"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";
import type { CompensationComponent } from "@/lib/types";

// A category is one of three kinds:
//  recurring + fixed    → added to every payslip at the fixed amount
//  recurring + variable → added to every payslip; the amount is a default to review each run
//  occasional           → NOT auto-added; included in a payslip only when you add it that month
function typeBadge(c: CompensationComponent) {
  if (!c.recurring) return <Badge tone="neutral">Occasional</Badge>;
  return c.is_fixed_amount ? <Badge tone="brand">Monthly · fixed</Badge> : <Badge tone="warning">Monthly · variable</Badge>;
}

/** Super-admin editor for an employee's base salary + dynamic compensation categories. */
export function CompensationEditor({
  employeeId,
  components,
  baseSalary,
}: {
  employeeId: string;
  components: CompensationComponent[];
  baseSalary: number;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [fixedAmount, setFixedAmount] = useState(true);
  const [busy, setBusy] = useState(false);
  // Show an empty field (not "0") so typing a value never leaves a leading zero, e.g. "020000".
  const [base, setBase] = useState(baseSalary ? String(baseSalary) : "");
  const [savingBase, setSavingBase] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!pending) { setBusy(false); setRemovingId(null); } }, [pending]);

  async function saveBase() {
    setSavingBase(true);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("salary_structures").select("id").eq("employee_id", employeeId).eq("is_active", true).maybeSingle();
    const value = Number(base) || 0;
    const { error } = existing
      ? await supabase.from("salary_structures").update({ base_salary: value }).eq("id", existing.id)
      : await supabase.from("salary_structures").insert({ employee_id: employeeId, base_salary: value, currency: "PKR" });
    setSavingBase(false);
    if (error) return toast.error(error.message);
    toast.success("Base salary updated");
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !amount) return toast.error("Label and amount required");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("compensation_components").insert({
      employee_id: employeeId,
      label,
      amount: Number(amount),
      description: description || null,
      recurring,
      is_fixed_amount: recurring ? fixedAmount : true,
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    toast.success("Category added");
    setLabel(""); setAmount(""); setDescription(""); setRecurring(true); setFixedAmount(true);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("compensation_components").delete().eq("id", id);
    if (error) { setRemovingId(null); return toast.error(error.message); }
    toast.success("Removed");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* base salary */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
        <FloatInput id="comp-base" label="Base salary (PKR)" hint="Set 0 for commission-only staff; net pay is then just their compensation categories." type="number" min={0} value={base} onChange={(e) => setBase(e.target.value)} wrapClassName="w-56" />
        <Button onClick={saveBase} disabled={savingBase}>{savingBase ? "Saving…" : "Update base salary"}</Button>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-medium text-text-secondary">Additional categories</p>
        {components.length === 0 && !pending && <p className="text-caption text-text-secondary">No additional compensation categories yet.</p>}
        {components.map((c) => (
          <div key={c.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{c.label}</span>
                {typeBadge(c)}
              </div>
              {c.description && <p className="text-caption text-text-secondary">{c.description}</p>}
              {!c.recurring && <p className="text-caption text-text-secondary">Not on the payslip by default; add it to a run when it applies.</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular font-semibold text-text-primary">{formatPKR(c.amount)}{c.recurring && !c.is_fixed_amount ? " (default)" : ""}</span>
              <button onClick={() => remove(c.id)} disabled={removingId === c.id} className="text-text-secondary hover:text-danger disabled:opacity-40" aria-label="Remove">
                {removingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          </div>
        ))}
        {pending && (
          <div className="animate-pulse rounded-md border border-border px-3 py-3">
            <div className="h-3.5 w-40 rounded bg-surface" /><div className="mt-2 h-2.5 w-24 rounded bg-surface" />
          </div>
        )}
      </div>

      <form onSubmit={add} className="space-y-3 rounded-md border border-dashed border-border p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FloatInput id="comp-label" label="Category" hint="e.g. Fuel Allowance, Bonus, Internet Allowance." value={label} onChange={(e) => setLabel(e.target.value)} />
          <FloatInput id="comp-amount" label={fixedAmount || !recurring ? "Amount (PKR)" : "Default amount (PKR)"} hint={recurring && !fixedAmount ? "The amount varies each month; this is the default you review per run." : "The amount added to pay for this category."} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <FloatInput id="comp-description" label="Description" hint="Why or when it was decided (shown for context)." value={description} onChange={(e) => setDescription(e.target.value)} wrapClassName="sm:col-span-2" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            Applies every month
          </label>
          {recurring && (
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={fixedAmount} onChange={(e) => setFixedAmount(e.target.checked)} />
              Fixed amount (uncheck if it varies each month)
            </label>
          )}
        </div>
        <p className="text-caption text-text-secondary">
          {recurring
            ? fixedAmount
              ? "Added to every payslip at this amount."
              : "Added to every payslip; review the amount each run."
            : "An occasional category (e.g. a bonus). Saved here but only added to a payslip when you apply it for that month."}
        </p>
        <Button type="submit" disabled={busy || pending}>{busy || pending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Plus className="size-4" /> Add category</>}</Button>
      </form>
    </div>
  );
}
