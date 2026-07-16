"use client";
// Receiving accounts config: every mechanism money lands in — bank accounts, Payoneer, Wise, Western
// Union. The account's TYPE is the payment method (the two are merged). Adding an account shows only the
// fields relevant to the chosen type. Admin/super only (deals.manage). Deals then pick one of these.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { RECEIVING_TYPES, RECEIVING_FIELDS, receivingTypeLabel } from "@/lib/crm/receiving";
import type { ReceivingAccount } from "@/lib/types";

// per-field label + hint for the conditional inputs
const FIELD_META: Record<string, { label: string; hint?: string }> = {
  bank_name: { label: "Bank name" },
  account_number: { label: "Account number" },
  iban: { label: "IBAN" },
  swift_code: { label: "SWIFT / BIC" },
  branch_code: { label: "Branch code" },
  branch_address: { label: "Branch address" },
  email: { label: "Account email", hint: "The email this Payoneer / Wise account is under." },
  cnic: { label: "CNIC", hint: "The recipient's CNIC used to collect a Western Union transfer." },
};

const EMPTY = {
  type: "bank", label: "", holder_name: "", notes: "",
  bank_name: "", account_number: "", iban: "", swift_code: "", branch_code: "", branch_address: "",
  email: "", cnic: "",
};

export function DealsSettings({ accounts }: { accounts: ReceivingAccount[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const extraFields = RECEIVING_FIELDS[form.type] ?? [];

  async function add() {
    if (!form.holder_name.trim()) return toast.error("Holder / identity name is required");
    setBusy(true);
    const res = await fetch("/api/crm/receiving-accounts", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to add");
    toast.success("Account added");
    setForm({ ...EMPTY });
    router.refresh();
  }

  async function remove(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/crm/receiving-accounts/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setRemovingId(null);
    if (!res.ok) return toast.error(json.error ?? "Failed to delete");
    toast.success("Deleted");
    router.refresh();
  }

  // a small secondary detail line per account for the list
  const detailLine = (a: ReceivingAccount) => {
    if (a.type === "bank") return [a.account_number, a.iban, a.swift_code].filter(Boolean).join(" · ") || null;
    if (a.type === "payoneer" || a.type === "wise") return a.email || null;
    if (a.type === "western_union") return a.cnic ? `CNIC ${a.cnic}` : null;
    return a.notes || null;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {accounts.length === 0 && <div className="rounded-md border border-dashed border-border py-6 text-center text-caption text-text-secondary">No receiving accounts yet. Add your bank accounts, Payoneer, Wise, or Western Union below.</div>}
        {accounts.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{receivingTypeLabel(a.type)}</Badge>
                <span className="truncate font-medium text-text-primary">{a.label?.trim() || a.holder_name}</span>
              </div>
              <p className="truncate text-caption text-text-secondary">{a.type === "bank" && a.bank_name ? `${a.bank_name} · ` : ""}{detailLine(a) ?? "—"}</p>
            </div>
            <button onClick={() => remove(a.id)} disabled={removingId === a.id} className="shrink-0 text-text-secondary hover:text-danger disabled:opacity-40" aria-label="Delete">
              {removingId === a.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
        <FloatSelect id="ra-type" label="Type" hint="The mechanism this account receives money through. This replaces the old separate payment method." value={form.type} onChange={(e) => set("type", e.target.value)}>
          {RECEIVING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </FloatSelect>
        <FloatInput id="ra-holder" label={form.type === "western_union" ? "Recipient name" : "Account holder / identity"} hint="Who the account belongs to." value={form.holder_name} onChange={(e) => set("holder_name", e.target.value)} />
        {extraFields.map((f) => (
          <FloatInput key={f} id={`ra-${f}`} label={FIELD_META[f].label} hint={FIELD_META[f].hint} wrapClassName={f === "branch_address" ? "sm:col-span-2" : undefined} value={form[f]} onChange={(e) => set(f, e.target.value)} />
        ))}
        <FloatInput id="ra-label" label="Label (optional)" hint="A short friendly name, e.g. 'Main HBL' or 'Owner Payoneer'." value={form.label} onChange={(e) => set("label", e.target.value)} />
        <FloatInput id="ra-notes" label="Notes (optional)" hint="Anything else worth recording." wrapClassName="sm:col-span-2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        <div className="sm:col-span-2">
          <Button size="sm" disabled={busy || !form.holder_name.trim()} onClick={add}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Adding…</> : <><Plus className="size-4" /> Add {receivingTypeLabel(form.type).toLowerCase()} account</>}
          </Button>
        </div>
      </div>
      <p className="text-caption text-text-secondary">Accounts added here appear in the <strong>Receiving account</strong> picker on every deal, so you can record where each deal&apos;s payment lands.</p>
    </div>
  );
}
