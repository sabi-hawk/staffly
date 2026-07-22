"use client";
// Inline lead actions on a Leads-tab card: change pipeline status (rejected/dismissed require a
// reason → feedback) and jump to the full lead. Writes via PATCH /api/crm/leads/[id] (updateLead).
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { NativeSelect } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { LEAD_STATUS_META, LEAD_REASON_STATUSES } from "@/lib/crm/constants";

const needsReason = (s: string) => (LEAD_REASON_STATUSES as readonly string[]).includes(s);

export function LeadCardActions({
  leadId,
  company,
  status,
  feedback,
  canDelete = false,
}: {
  leadId: string;
  company: string;
  status: string;
  feedback: string | null;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null); // a chosen status awaiting confirm/reason
  const [reason, setReason] = useState(feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Keep the control in a loading state THROUGH the server refresh (not just the fetch) so the toast
  // never lands seconds before the card visibly updates — the old "is it stuck?" confusion. `optimistic`
  // shows the chosen status immediately so it doesn't flip back to the old value during the refresh.
  const [isRefreshing, startRefresh] = useTransition();
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const workingStatus = optimistic ?? pending ?? status;
  const loading = busy || isRefreshing;
  useEffect(() => { if (!isRefreshing) setOptimistic(null); }, [isRefreshing]);

  async function del() {
    setBusy(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      return toast.error(error ?? "Could not delete the lead");
    }
    toast.success(`Deleted: ${company}`);
    startRefresh(() => router.refresh());
  }

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
    toast.success(next === "closed" ? `Closed: ${company}` : "Lead updated");
    setPending(null);
    setOptimistic(next); // hold the new status on-screen until the refresh confirms it
    startRefresh(() => router.refresh());
  }

  function onPick(next: string) {
    if (next === status) return;
    if (needsReason(next)) setPending(next); // reveal the reason box
    else save(next);
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <label htmlFor={`lead-status-${leadId}`} className="sr-only">Status</label>
      <NativeSelect
        id={`lead-status-${leadId}`}
        className="h-8 text-caption"
        value={workingStatus}
        onChange={(e) => onPick(e.target.value)}
        disabled={loading}
      >
        {LEAD_STATUS_META.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </NativeSelect>
      {loading && <span className="inline-flex items-center gap-1 text-caption text-text-secondary"><Loader2 className="size-3.5 animate-spin" /> Updating…</span>}

      <Link
        href={`/crm/leads/${leadId}`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption text-text-secondary hover:bg-surface"
      >
        <Pencil className="size-3.5" /> Edit
      </Link>

      {canDelete && (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={loading}
          title="Delete lead"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption text-text-secondary hover:bg-danger/10 hover:text-danger hover:border-danger/40"
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete the “${company}” lead?`}
        description="This permanently removes the lead and all its interviews, assessments, contacts and documents. Any deal keeps its record. This cannot be undone."
        confirmLabel="Delete lead"
        tone="danger"
        onConfirm={async () => { await del(); }}
      />

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
            disabled={loading || !reason.trim()}
            onClick={() => save(pending, reason.trim())}
            className="h-8 rounded-md bg-brand-primary px-3 text-caption font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            disabled={loading}
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
