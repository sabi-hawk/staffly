"use client";
// Receiving accounts config: every mechanism money lands in — bank accounts, Payoneer, Wise, Western
// Union. The account's TYPE is the payment method (the two are merged). Adding an account shows only the
// fields relevant to the chosen type. Admin/super only (deals.manage). Deals then pick one of these.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { CreatableCombo } from "@/components/ui/creatable-combo";
import { RECEIVING_TYPES, RECEIVING_FIELDS, receivingTypeLabel, PK_BANKS } from "@/lib/crm/receiving";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const extraFields = RECEIVING_FIELDS[form.type] ?? [];

  function openAdd() { setEditingId(null); setForm({ ...EMPTY }); setShowForm(true); }
  function startEdit(a: ReceivingAccount) {
    setEditingId(a.id);
    setShowForm(true);
    setForm({
      type: a.type, label: a.label ?? "", holder_name: a.holder_name ?? "", notes: a.notes ?? "",
      bank_name: a.bank_name ?? "", account_number: a.account_number ?? "", iban: a.iban ?? "",
      swift_code: a.swift_code ?? "", branch_code: a.branch_code ?? "", branch_address: a.branch_address ?? "",
      email: a.email ?? "", cnic: a.cnic ?? "",
    });
    if (typeof document !== "undefined") document.getElementById("ra-type")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function cancelEdit() { setEditingId(null); setForm({ ...EMPTY }); setShowForm(false); }

  async function save() {
    if (!form.holder_name.trim()) return toast.error("Holder / identity name is required");
    setBusy(true);
    const res = await fetch(editingId ? `/api/crm/receiving-accounts/${editingId}` : "/api/crm/receiving-accounts", {
      method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(editingId ? "Account updated" : "Account added");
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowForm(false);
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

  const holderLabel = form.type === "western_union" ? "Recipient name" : "Account title";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-text-secondary">{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span>
        {!showForm && <Button size="sm" onClick={openAdd}><Plus className="size-4" /> Add account</Button>}
      </div>

      <div className="space-y-2.5">
        {accounts.length === 0 && !showForm && <div className="rounded-lg border border-dashed border-border py-8 text-center text-caption text-text-secondary">No receiving accounts yet. Click &ldquo;Add account&rdquo; to add a bank, Payoneer, Wise, or Western Union.</div>}
        {accounts.map((a, i) => (
          <div key={a.id} className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${editingId === a.id ? "border-brand-primary bg-brand-primary/5" : "border-border hover:border-brand-primary/40"}`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-caption font-semibold tabular-nums text-text-secondary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-text-primary">{a.label?.trim() || a.holder_name}</span>
                <Badge tone="neutral">{receivingTypeLabel(a.type)}</Badge>
                {editingId === a.id && <span className="text-caption text-brand-primary">editing…</span>}
              </div>
              <p className="truncate text-caption text-text-secondary">{a.type === "bank" && a.bank_name ? `${a.bank_name} · ` : ""}{detailLine(a) ?? "—"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => startEdit(a)} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-brand-primary" aria-label={`Edit ${a.holder_name}`}><Pencil className="size-4" /></button>
              <button onClick={() => remove(a.id)} disabled={removingId === a.id} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-danger disabled:opacity-40" aria-label="Delete">
                {removingId === a.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="grid gap-3 rounded-lg border border-brand-primary/40 bg-surface/30 p-4 sm:grid-cols-2">
          <div className="col-span-full flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">{editingId ? "Edit account" : "New account"}</span>
            <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-text-primary"><X className="size-3.5" /> Cancel</button>
          </div>
          <FloatSelect id="ra-type" label="Type" hint="The mechanism this account receives money through. This replaces the old separate payment method." value={form.type} onChange={(e) => set("type", e.target.value)}>
            {RECEIVING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FloatSelect>
          <FloatInput id="ra-holder" label={holderLabel} hint="A name for this account, e.g. the owner or the persona it belongs to." value={form.holder_name} onChange={(e) => set("holder_name", e.target.value)} />
          {extraFields.map((f) => (
            f === "bank_name"
              ? <CreatableCombo key={f} id="ra-bank_name" label="Bank name" hint="Pick a bank or type any other." options={PK_BANKS} value={form.bank_name} onChange={(v) => set("bank_name", v)} searchPlaceholder="Search or type a bank…" />
              : <FloatInput key={f} id={`ra-${f}`} label={FIELD_META[f].label} hint={FIELD_META[f].hint} wrapClassName={f === "branch_address" ? "sm:col-span-2" : undefined} value={form[f]} onChange={(e) => set(f, e.target.value)} />
          ))}
          <FloatInput id="ra-label" label="Label (optional)" hint="A short friendly name shown in lists, e.g. 'Main HBL' or 'Owner Payoneer'." value={form.label} onChange={(e) => set("label", e.target.value)} />
          <FloatInput id="ra-notes" label="Notes (optional)" hint="Anything else worth recording." wrapClassName="sm:col-span-2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button size="sm" disabled={busy || !form.holder_name.trim()} onClick={save}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : editingId ? <>Save changes</> : <><Plus className="size-4" /> Add {receivingTypeLabel(form.type).toLowerCase()} account</>}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}

      <p className="text-caption text-text-secondary">Accounts added here appear in the <strong>Receiving account</strong> picker on every deal, so you can record where each deal&apos;s payment lands.</p>
    </div>
  );
}
