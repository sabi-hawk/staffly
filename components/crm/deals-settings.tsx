"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ReceivingAccount, PaymentMethod } from "@/lib/types";

export function DealsSettings({ accounts, methods }: { accounts: ReceivingAccount[]; methods: PaymentMethod[] }) {
  const router = useRouter();
  const [acc, setAcc] = useState({ holder_name: "", bank_name: "", account_number: "", notes: "" });
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, opts: RequestInit, ok: string) {
    setBusy(true);
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error ?? "Failed"); return false; }
    toast.success(ok);
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Receiving accounts */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-primary">Receiving accounts</h3>
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="truncate"><span className="font-medium">{a.holder_name}</span> · {a.bank_name ?? "—"} · {a.account_number ?? "—"}</span>
              <Button variant="outline" size="sm" onClick={() => call(`/api/crm/receiving-accounts/${a.id}`, { method: "DELETE" }, "Deleted")} aria-label="Delete"><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {accounts.length === 0 && <div className="text-caption text-text-secondary">No accounts yet.</div>}
        </div>
        <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Holder name *</Label><Input value={acc.holder_name} onChange={(e) => setAcc({ ...acc, holder_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Bank</Label><Input value={acc.bank_name} onChange={(e) => setAcc({ ...acc, bank_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Account number</Label><Input value={acc.account_number} onChange={(e) => setAcc({ ...acc, account_number: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Input value={acc.notes} onChange={(e) => setAcc({ ...acc, notes: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={busy || !acc.holder_name.trim()}
              onClick={async () => { if (await call("/api/crm/receiving-accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(acc) }, "Account added")) setAcc({ holder_name: "", bank_name: "", account_number: "", notes: "" }); }}>
              <Plus className="size-4" /> Add account
            </Button>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-primary">Payment methods</h3>
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium">{m.name}</span>
              <Button variant="outline" size="sm" onClick={() => call(`/api/crm/payment-methods/${m.id}`, { method: "DELETE" }, "Deleted")} aria-label="Delete"><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {methods.length === 0 && <div className="text-caption text-text-secondary">No methods yet.</div>}
        </div>
        <div className="flex items-end gap-2 rounded-md border border-border p-3">
          <div className="flex-1 space-y-1.5"><Label>New method</Label><Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. Crypto" /></div>
          <Button size="sm" disabled={busy || !method.trim()}
            onClick={async () => { if (await call("/api/crm/payment-methods", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: method }) }, "Method added")) setMethod(""); }}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
