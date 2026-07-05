"use client";
// Assign developers/closers to a deal (admin/super only). Many-to-many: a person can be developer
// and/or closer; a deal can have several. Edit the list and Save (replace-all). The assigned developer
// then sees this deal's NAME on their own dashboard (via my_deals()).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Opt } from "@/lib/crm/options";

type Row = { developer_id: string; role: "developer" | "closer" };
const selectCls = "h-9 rounded-md border border-border bg-white px-3 text-sm";

export function DealDevelopers({ dealId, developers, initial }: { dealId: string; developers: Opt[]; initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : []);
  const [busy, setBusy] = useState(false);

  const add = () => setRows((r) => [...r, { developer_id: "", role: "developer" }]);
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));

  async function save() {
    const assignments = rows.filter((r) => r.developer_id);
    setBusy(true);
    const res = await fetch(`/api/crm/deals/${dealId}/developers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Failed to save");
    toast.success("Assignments saved");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-secondary">
        Who works this deal. Assigned developers see this deal&apos;s <span className="font-medium">name</span> on their
        dashboard (not the financials). A person can be the closer and/or the developer.
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select className={`${selectCls} min-w-[220px]`} value={r.developer_id} onChange={(e) => update(i, { developer_id: e.target.value })} aria-label="Developer">
              <option value="">Select a developer…</option>
              {developers.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <select className={selectCls} value={r.role} onChange={(e) => update(i, { role: e.target.value as Row["role"] })} aria-label="Role">
              <option value="developer">Developer</option>
              <option value="closer">Closer</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => remove(i)} aria-label="Remove"><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-text-secondary">No developers assigned yet.</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={add}><Plus className="size-4" /> Add developer</Button>
        <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save assignments"}</Button>
      </div>
    </div>
  );
}
