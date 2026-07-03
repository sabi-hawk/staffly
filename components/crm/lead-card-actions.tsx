"use client";
// Inline lead actions on a Leads-tab card: change pipeline status (rejected/dismissed require a
// reason → feedback) and jump to the full lead. Writes via PATCH /api/crm/leads/[id] (updateLead).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { LEAD_STATUS_META, LEAD_REASON_STATUSES } from "@/lib/crm/constants";

const selectCls = "h-8 rounded-md border border-border bg-white px-2 text-caption";
const needsReason = (s: string) => (LEAD_REASON_STATUSES as readonly string[]).includes(s);

export function LeadCardActions({
  leadId,
  company,
  status,
  feedback,
}: {
  leadId: string;
  company: string;
  status: string;
  feedback: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null); // a chosen status awaiting confirm/reason
  const [reason, setReason] = useState(feedback ?? "");
  const [busy, setBusy] = useState(false);

  async function save(next: string, note?: string) {
    setBusy(true);
    const body: Record<string, unknown> = { status: next };
    if (note !== undefined) body.feedback = note;
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(error ?? "Could not update the lead");
      return;
    }
    toast.success(next === "closed" ? `Closed — ${company}` : "Lead updated");
    setPending(null);
    router.refresh();
  }

  function onPick(next: string) {
    if (next === status) return;
    if (needsReason(next)) setPending(next); // reveal the reason box
    else save(next);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <label htmlFor={`lead-status-${leadId}`} className="sr-only">Status</label>
      <select
        id={`lead-status-${leadId}`}
        className={selectCls}
        value={pending ?? status}
        onChange={(e) => onPick(e.target.value)}
        disabled={busy}
      >
        {LEAD_STATUS_META.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <Link
        href={`/crm/leads/${leadId}`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption text-text-secondary hover:bg-surface"
      >
        <Pencil className="size-3.5" /> Edit
      </Link>

      {pending && (
        <div className="mt-1 flex w-full items-center gap-2">
          <label htmlFor={`lead-reason-${leadId}`} className="sr-only">Reason</label>
          <input
            id={`lead-reason-${leadId}`}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Reason for "${LEAD_STATUS_META.find((s) => s.value === pending)?.label}" (required)`}
            className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-caption"
          />
          <button
            disabled={busy || !reason.trim()}
            onClick={() => save(pending, reason.trim())}
            className="h-8 rounded-md bg-brand-primary px-3 text-caption font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            disabled={busy}
            onClick={() => { setPending(null); setReason(feedback ?? ""); }}
            className="h-8 rounded-md border border-border px-3 text-caption text-text-secondary"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
