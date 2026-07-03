"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DISQUALIFY_CATEGORIES } from "@/lib/crm/constants";

const selectCls = "h-9 rounded-md border border-border bg-white px-3 text-sm";

export function DisqualifyPanel({
  leadId,
  disqualified,
  category,
  note,
}: {
  leadId: string;
  disqualified: boolean;
  category: string | null;
  note: string | null;
}) {
  const router = useRouter();
  const [cat, setCat] = useState("fake_job");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: object, ok: string) {
    setBusy(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(ok);
    router.refresh();
  }

  if (disqualified) {
    const label = DISQUALIFY_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? "—";
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge tone="danger">Not a lead</Badge>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {note && <p className="text-sm text-text-secondary">{note}</p>}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act({ action: "requalify" }, "Re-qualified")}>
          Re-qualify
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="disqualify-reason">Reason</Label>
        <select id="disqualify-reason" className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
          {DISQUALIFY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 flex-1 min-w-[200px]">
        <Label htmlFor="disqualify-note">Note *</Label>
        <Input id="disqualify-note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why isn't this a real lead?" />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !text.trim()}
        onClick={() => act({ action: "disqualify", category: cat, note: text }, "Marked not a lead")}
      >
        Mark not a lead
      </Button>
    </div>
  );
}
