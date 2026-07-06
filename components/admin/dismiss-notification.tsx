"use client";
// Dismiss an admin notification (sets resolved_at — it stops appearing). RLS: notifications.view
// holders may update admin_notifications (0036), so a direct browser update is safe.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DismissNotification({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function dismiss() {
    setBusy(true);
    const { error } = await createClient()
      .from("admin_notifications")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    router.refresh();
  }
  return (
    <button
      onClick={dismiss}
      disabled={busy}
      aria-label="Dismiss notification"
      title="Dismiss"
      className="ml-auto shrink-0 rounded-md p-1 text-text-secondary hover:bg-surface hover:text-text-primary"
    >
      <X className="size-4" />
    </button>
  );
}
