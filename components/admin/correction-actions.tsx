"use client";
// Admin approve/reject for a timesheet correction request. Approve applies the times to attendance;
// reject carries a note the employee sees. Mirrors LeaveActions.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/dialog";

export function CorrectionActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function decide(status: "approved" | "rejected", note: string | null = null) {
    setBusy(true);
    const res = await fetch(`/api/admin/attendance-corrections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(status === "approved" ? "Correction approved & applied" : "Correction rejected");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="success" disabled={busy} onClick={() => decide("approved")}>Approve</Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>
      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Reject this correction request?"
        label="Reason (shown to the employee)"
        required
        tone="danger"
        submitLabel="Reject"
        onSubmit={async (note) => { await decide("rejected", note); }}
      />
    </div>
  );
}
