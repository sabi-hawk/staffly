"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";
import type { CompensationComponent } from "@/lib/types";

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
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState(String(baseSalary ?? 0));
  const [savingBase, setSavingBase] = useState(false);

  async function saveBase() {
    setSavingBase(true);
    const supabase = createClient();
    // update the active salary structure, or create one if none exists
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
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Category added");
    setLabel(""); setAmount(""); setDescription(""); setRecurring(true);
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("compensation_components").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* base salary */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
        <div className="space-y-1.5">
          <Label>Base salary (PKR)</Label>
          <Input type="number" min={0} value={base} onChange={(e) => setBase(e.target.value)} className="w-48" />
          <p className="text-caption text-text-secondary">Set 0 for commission-only staff — net pay is then just their compensation categories.</p>
        </div>
        <Button onClick={saveBase} disabled={savingBase}>{savingBase ? "Saving…" : "Update base salary"}</Button>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-medium text-text-secondary">Additional categories</p>
        {components.length === 0 && (
          <p className="text-caption text-text-secondary">No additional compensation categories yet.</p>
        )}
        {components.map((c) => (
          <div key={c.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{c.label}</span>
                <Badge tone={c.recurring ? "brand" : "neutral"}>{c.recurring ? "recurring" : "one-off"}</Badge>
              </div>
              {c.description && <p className="text-caption text-text-secondary">{c.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular font-semibold text-text-primary">{formatPKR(c.amount)}</span>
              <button onClick={() => remove(c.id)} className="text-text-secondary hover:text-danger" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Fuel Allowance" />
        </div>
        <div className="space-y-1.5">
          <Label>Amount (PKR)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why / when it was decided" />
        </div>
        <label className="flex items-center gap-2 text-caption text-text-secondary">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Recurring (applies every month)
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            <Plus className="size-4" /> Add category
          </Button>
        </div>
      </form>
    </div>
  );
}
