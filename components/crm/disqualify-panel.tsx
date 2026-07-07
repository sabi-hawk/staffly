"use client";
// Lead qualification. Default = Qualified. "Mark as unqualified" reveals a reason (category + note)
// which dismisses the lead (reusing the disqualify action). Reopen with "Mark qualified".
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { DISQUALIFY_CATEGORIES } from "@/lib/crm/constants";

export function QualificationPanel({
  leadId,
  unqualified,
  category,
  note,
}: {
  leadId: string;
  unqualified: boolean;
  category: string | null;
  note: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false); // collapse the reveal form so state is clean after (un)qualifying
    setText("");
    router.refresh();
  }

  if (unqualified) {
    const label = DISQUALIFY_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? "—";
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="danger">Unqualified</Badge>
          <span className="text-sm font-medium text-text-primary">{label}</span>
        </div>
        {note && <p className="text-sm text-text-secondary">{note}</p>}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act({ action: "requalify" }, "Marked qualified")}>
          Mark qualified
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">Qualified</Badge>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Mark as unqualified</Button>
        )}
      </div>
      {open && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-caption text-text-secondary">Why isn&apos;t this a qualified lead?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatSelect
              id="unqual-reason"
              label="Reason"
              hint="Why this lead is not worth pursuing, for example a fake job posting or a budget that is too low."
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              {DISQUALIFY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </FloatSelect>
            <FloatInput
              id="unqual-note"
              label="Note *"
              hint="A short explanation of why this lead is unqualified. This is required."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !text.trim()} onClick={() => act({ action: "disqualify", category: cat, note: text }, "Marked unqualified")}>
              Confirm unqualified
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
