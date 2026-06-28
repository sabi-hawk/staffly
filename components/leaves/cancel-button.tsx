"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CancelLeaveButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true);
    const res = await fetch(`/api/leaves/${id}/cancel`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Request cancelled");
    router.refresh();
  }
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
  );
}
