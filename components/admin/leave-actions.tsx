"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LeaveActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(status: "approved" | "rejected") {
    // A rejection should carry a reason — the employee sees it on their Leaves page (decision_note).
    let note: string | null = null;
    if (status === "rejected") {
      note = prompt("Reason for rejecting (shown to the employee):");
      if (note === null) return; // cancelled
      if (!note.trim()) return toast.error("Please give a short reason");
    }
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
      <Button size="sm" variant="danger" disabled={busy} onClick={() => decide("rejected")}>Reject</Button>
    </div>
  );
}
