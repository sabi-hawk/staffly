"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FloatInput } from "@/components/ui/field";

/** Time portion (HH:MM in Asia/Karachi) of an ISO instant, for the input default. */
function localTime(iso: string | null): string {
  if (!iso) return "18:00";
  return new Date(iso).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
}

/**
 * Edit check-in and/or check-out for a record — opens a modal (no inline grid shift).
 * - admin mode: both times editable + reason
 * - employee mode: checkout only (own current day)
 */
export function EditAttendance({
  attendanceId,
  workDate,
  employeeName,
  checkInTime,
  checkOutTime,
  mode = "admin",
}: {
  attendanceId: string;
  workDate: string;
  employeeName?: string;
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

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Edit attendance</DialogTitle>
          <DialogDescription>
            {employeeName ? `${employeeName} · ` : ""}{workDate}. A checkout time earlier than the check-in is treated as the next day (e.g. in 3pm, out 1am).
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {mode === "admin" && (
              <FloatInput id="edit-in" type="time" label="Check in" value={inT} onChange={(e) => setInT(e.target.value)} />
            )}
            <FloatInput id="edit-out" type="time" label="Check out" value={outT} onChange={(e) => setOutT(e.target.value)}
              wrapClassName={mode === "admin" ? "" : "col-span-2"} />
            {mode === "admin" && (
              <FloatInput id="edit-reason" label="Reason" hint="Why the record is being changed. Shown in the activity log."
                value={reason} onChange={(e) => setReason(e.target.value)} wrapClassName="col-span-2" />
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
