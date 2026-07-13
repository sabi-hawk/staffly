"use client";
// Edit + delete actions for a CRM profile row. Edit jumps to the profile page; delete removes it
// (with a confirm) via DELETE /api/crm/profiles/[id]. Shown only to profile managers.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";

export function ProfileRowActions({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const res = await fetch(`/api/crm/profiles/${profileId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      return toast.error(error ?? "Could not delete the profile");
    }
    toast.success(`Deleted: ${name}`);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link href={`/crm/profiles/${profileId}`} title="Edit" className="inline-flex text-text-secondary hover:text-brand-primary"><Pencil className="size-4" /></Link>
      <button onClick={() => setConfirm(true)} disabled={busy} title="Delete profile" className="inline-flex text-text-secondary hover:text-danger disabled:opacity-40">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete the "${name}" profile?`}
        description="This permanently removes the profile and its documents. Any lead, interview, assessment or deal keeps its record (the profile link is cleared). This cannot be undone."
        confirmLabel="Delete profile"
        tone="danger"
        onConfirm={async () => { await del(); }}
      />
    </div>
  );
}
