"use client";
// Actions for an interview/assessment grid row: Open lead · Edit (in the lead) · Delete (this record).
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/crm/copy-button";

export function ActivityRowActions({
  kind,
  id,
  leadId,
  copyText,
}: {
  kind: "interviews" | "assessments";
  id: string;
  leadId: string | null;
  copyText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const noun = kind === "interviews" ? "interview" : "assessment";

  async function del() {
    if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/crm/${kind}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      return toast.error(error ?? `Could not delete the ${noun}`);
    }
    toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
    router.refresh();
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
      <button onClick={del} disabled={busy} className={`${btn} hover:text-danger`} title={`Delete ${noun}`} aria-label={`Delete ${noun}`}>
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
