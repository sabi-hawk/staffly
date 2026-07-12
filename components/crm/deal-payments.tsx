"use client";
// Deal finance: a ledger of money actually received against a deal. Each payment records the receiving
// date, the BILLING MONTH it counts toward (can differ — received 2 Aug, billed to July), the PKR that
// landed, and an optional note. Totals are grouped by billing month; this feeds BD deal commissions.
// Super-admin only (deal_payments RLS). Writes via the RLS-guarded browser client.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { formatPKR, formatCrmDate } from "@/lib/utils";

export type DealPayment = {
  id: string;
  amount: number;
  received_on: string;
  billing_month: string; // YYYY-MM-01
  note: string | null;
  created_at: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
};

export function DealPayments({ dealId, payments }: { dealId: string; payments: DealPayment[] }) {
  const router = useRouter();
  const now = new Date();
  const [receivedOn, setReceivedOn] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(String);

  // group by billing month for the running totals
  const byMonth = new Map<string, number>();
  for (const p of payments) {
    const key = p.billing_month.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(p.amount));
  }
  const monthTotals = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const grand = payments.reduce((s, p) => s + Number(p.amount), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!receivedOn || !amount) return toast.error("Receiving date and amount are required");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("deal_payments").insert({
      deal_id: dealId,
      amount: Number(amount),
      received_on: receivedOn,
      billing_month: `${year}-${month}-01`,
      note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment logged");
    setReceivedOn(""); setAmount(""); setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("deal_payments").delete().eq("id", id);
    setRemovingId(null);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* running totals per billing month */}
      {monthTotals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-caption">
          <span className="text-text-secondary">Received:</span>
          {monthTotals.map(([m, t]) => (
            <span key={m} className="rounded-md border border-border bg-surface px-2 py-0.5">
              {monthLabel(`${m}-01`)}: <span className="font-semibold tabular">{formatPKR(t)}</span>
            </span>
          ))}
          <span className="ml-auto font-semibold text-text-primary">Total {formatPKR(grand)}</span>
        </div>
      )}

      {/* ledger */}
      <div className="space-y-2">
        {payments.length === 0 && <p className="text-caption text-text-secondary">No payments logged yet.</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex items-start justify-between rounded-md border border-border p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold tabular text-text-primary">{formatPKR(p.amount)}</span>
                <span className="rounded bg-brand-light/50 px-1.5 py-0.5 text-caption font-medium text-brand-primary">for {monthLabel(p.billing_month.slice(0, 7))}</span>
              </div>
              <p className="text-caption text-text-secondary">
                Received {formatCrmDate(p.received_on)} · logged {formatCrmDate(p.created_at.slice(0, 10))}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </div>
            <button onClick={() => remove(p.id)} disabled={removingId === p.id} className="text-text-secondary hover:text-danger disabled:opacity-40" aria-label="Remove">
              {removingId === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
        ))}
      </div>

      {/* add a payment */}
      <form onSubmit={add} className="space-y-3 rounded-md border border-dashed border-border p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DatePicker id="dp-received" label="Receiving date" hint="When the money actually arrived in your account." value={receivedOn} onChange={setReceivedOn} />
          <FloatSelect id="dp-month" label="Billing month" hint="Which month this payment counts toward (can differ from the receiving date, e.g. received in August but billed to July)." value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
          </FloatSelect>
          <FloatSelect id="dp-year" label="Year" hint="The billing month's year." value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </FloatSelect>
          <FloatInput id="dp-amount" label="Amount (PKR)" hint="The PKR that actually landed (after any currency conversion)." type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <FloatInput id="dp-note" label="Note" hint="Optional, e.g. the original foreign amount or the channel: '$2,000 via Wise'." value={note} onChange={(e) => setNote(e.target.value)} wrapClassName="sm:col-span-2 lg:col-span-4" />
        </div>
        <Button type="submit" disabled={busy}><Plus className="size-4" /> {busy ? "Saving…" : "Log payment"}</Button>
      </form>
    </div>
  );
}
