"use client";
// Actions for an interview/assessment grid row. A BD may DISMISS a record (crosses it out, kept for
// audit) but never hard-delete; only a super admin may RESTORE (un-dismiss) or DELETE. Buttons shown
// depend on role (canManage = super admin) and whether the row is already dismissed.
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Trash2, CircleX, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/crm/copy-button";
import { ConfirmDialog, ReasonDialog } from "@/components/ui/dialog";

export function ActivityRowActions({
  kind,
  id,
  leadId,
  copyText,
  dismissed = false,
  canManage = false,
}: {
  kind: "interviews" | "assessments";
  id: string;
  leadId: string | null;
  copyText?: string;
  dismissed?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  // Stay busy THROUGH the server refresh so the row visibly updates (crossed out / gone) before the
  // control frees up — the toast never lands seconds ahead of the change.
  const [isRefreshing, startRefresh] = useTransition();
  const loading = busy || isRefreshing;
  const noun = kind === "interviews" ? "interview" : "assessment";
  const Noun = `${noun[0].toUpperCase()}${noun.slice(1)}`;

  async function send(method: "DELETE" | "PATCH", body?: unknown, ok?: string, fail?: string) {
    setBusy(true);
    const res = await fetch(`/api/crm/${kind}/${id}`, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: fail }));
      return toast.error(error ?? fail);
    }
    toast.success(ok!);
    startRefresh(() => router.refresh());
  }

  const btn = "inline-flex size-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface";
  return (
    <div className="flex items-center justify-end gap-1">
      {copyText && <CopyButton text={copyText} />}
      {leadId && (
        <>
          <Link href={`/crm/leads/${leadId}`} className={btn} title="Open lead" aria-label="Open lead">
            <ExternalLink className="size-3.5" />
          </Link>
          <Link href={`/crm/leads/${leadId}?edit=${kind}:${id}`} className={btn} title={`Edit ${noun} (in the lead)`} aria-label={`Edit ${noun}`}>
            <Pencil className="size-3.5" />
          </Link>
        </>
      )}

      {/* Dismiss: available while the row is live. Restore: super admin only, when dismissed. */}
      {!dismissed && (
        <button onClick={() => setConfirmDismiss(true)} disabled={loading} className={`${btn} hover:text-warning`} title={`Dismiss ${noun}`} aria-label={`Dismiss ${noun}`}>
          <CircleX className="size-3.5" />
        </button>
      )}
      {dismissed && canManage && (
        <button onClick={() => send("PATCH", { _restore: true }, `${Noun} restored`, `Could not restore the ${noun}`)} disabled={loading} className={`${btn} hover:text-success`} title={`Restore ${noun}`} aria-label={`Restore ${noun}`}>
          <RotateCcw className="size-3.5" />
        </button>
      )}
      {dismissed && !canManage && (
        <span className="rounded-md border border-border px-1.5 text-[11px] leading-6 text-text-secondary" title="A super admin can restore or delete this">Dismissed</span>
      )}

      {/* Hard delete: super admin only. */}
      {canManage && (
        <button onClick={() => setConfirmDelete(true)} disabled={loading} className={`${btn} hover:text-danger`} title={`Delete ${noun}`} aria-label={`Delete ${noun}`}>
          <Trash2 className="size-3.5" />
        </button>
      )}

      <ReasonDialog
        open={confirmDismiss}
        onOpenChange={setConfirmDismiss}
        title={`Dismiss this ${noun}?`}
        description="It stays for the record but is crossed out. A super admin can restore or delete it."
        label="Reason (optional)"
        placeholder="Why is this being dismissed?"
        required={false}
        submitLabel="Dismiss"
        onSubmit={async (reason) => { await send("PATCH", { _dismiss: true, reason }, `${Noun} dismissed`, `Could not dismiss the ${noun}`); }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete this ${noun}?`}
        description="This permanently removes the record and cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => { await send("DELETE", undefined, `${Noun} deleted`, `Could not delete the ${noun}`); }}
      />
    </div>
  );
}
