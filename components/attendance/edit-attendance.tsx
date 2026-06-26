"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Time portion (HH:MM in Asia/Karachi) of an ISO instant, for the input default. */
function localTime(iso: string | null): string {
  if (!iso) return "18:00";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Edit check-in and/or check-out for a record.
 * - admin mode: both times editable + reason
 * - employee mode: checkout only (own current day)
 */
export function EditAttendance({
  attendanceId,
  workDate,
  checkInTime,
  checkOutTime,
  mode = "admin",
}: {
  attendanceId: string;
  workDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  mode?: "admin" | "employee";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inT, setInT] = useState(localTime(checkInTime));
  const [outT, setOutT] = useState(localTime(checkOutTime));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const body: Record<string, string> = { edit_reason: reason || "manual edit" };
    if (mode === "admin") body.check_in_time = new Date(`${workDate}T${inT}:00+05:00`).toISOString();
    body.check_out_time = new Date(`${workDate}T${outT}:00+05:00`).toISOString();
    const res = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Attendance updated");
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "admin" && (
        <label className="flex items-center gap-1 text-caption text-text-secondary">
          In
          <Input type="time" value={inT} onChange={(e) => setInT(e.target.value)} className="h-8 w-28" />
        </label>
      )}
      <label className="flex items-center gap-1 text-caption text-text-secondary">
        Out
        <Input type="time" value={outT} onChange={(e) => setOutT(e.target.value)} className="h-8 w-28" />
      </label>
      {mode === "admin" && (
        <Input placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 w-32" />
      )}
      <Button size="sm" onClick={save} disabled={busy}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
    </div>
  );
}
