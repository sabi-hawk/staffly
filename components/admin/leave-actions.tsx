"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/dialog";

export function LeaveActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // A rejection carries a reason — the employee sees it on their Leaves page (decision_note).
  async function decide(status: "approved" | "rejected", note: string | null = null) {
    setBusy(true);
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(`Leave ${status}`);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="success" disabled={busy} onClick={() => decide("approved")}>Approve</Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>
      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Reject this leave request?"
        label="Reason (shown to the employee)"
        required
        tone="danger"
        submitLabel="Reject"
        onSubmit={async (note) => { await decide("rejected", note); }}
      />
    </div>
  );
}
