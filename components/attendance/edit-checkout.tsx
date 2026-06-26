"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Inline edit of a checkout time (employee: own current day; admin: any with reason). */
export function EditCheckout({
  attendanceId,
  workDate,
  requireReason = false,
}: {
  attendanceId: string;
  workDate: string;
  requireReason?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const iso = new Date(`${workDate}T${time}:00+05:00`).toISOString();
    const res = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ check_out_time: iso, edit_reason: reason || "self edit" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Checkout updated");
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Set checkout
      </Button>
    );

  return (
    <div className="flex items-center gap-2">
      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 w-28" />
      {requireReason && (
        <Input placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 w-32" />
      )}
      <Button size="sm" onClick={save} disabled={busy}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
    </div>
  );
}
