"use client";
// Employee-facing timesheet correction request. For a past day that's missing or has the wrong times
// (forgot to check in/out), enter the intended check-in/out + reason. It goes to an admin as PENDING;
// nothing changes until they approve. Opens a modal from the dashboard / attendance page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { companyToday } from "@/lib/time";

const BACKDATE_DAYS = 7;
const toIso = (date: string, time: string) => (date && time ? new Date(`${date}T${time}:00+05:00`).toISOString() : null);

export function CorrectionRequest({
  defaultDate,
  defaultKind = "wrong_time",
  defaultIn = "",
  defaultOut = "",
  triggerLabel = "Fix a day",
  variant = "secondary",
}: {
  defaultDate?: string;
  defaultKind?: "missing" | "wrong_time" | "forgot_checkout";
  defaultIn?: string;
  defaultOut?: string;
  triggerLabel?: string;
  variant?: "secondary" | "outline" | "danger";
}) {
  const router = useRouter();
  const today = companyToday();
  const minDate = companyToday(new Date(new Date(`${today}T00:00:00+05:00`).getTime() - BACKDATE_DAYS * 86_400_000));

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate ?? today);
  const [kind, setKind] = useState(defaultKind);
  const [inT, setInT] = useState(defaultIn);
  const [outT, setOutT] = useState(defaultOut);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!inT && !outT) return toast.error("Enter the check-in and/or check-out time you meant.");
    setBusy(true);
    const res = await fetch("/api/attendance/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ work_date: date, kind, check_in: toIso(date, inT), check_out: toIso(date, outT), reason }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Could not submit the request");
    toast.success("Correction requested — pending admin approval");
    setOpen(false);
    setReason(""); setInT(""); setOutT("");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Wrench className="size-3.5" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Request a timesheet correction</DialogTitle>
          <DialogDescription>
            For a past day that&apos;s missing or has the wrong times. It stays pending until an admin approves; nothing changes until then.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DatePicker id="corr-date" label="Day" hint={`The day to fix (up to ${BACKDATE_DAYS} days back).`} value={date} min={minDate} max={today} onChange={setDate} />
            <FloatSelect id="corr-kind" label="Reason type" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="wrong_time">Wrong times (forgot to check in/out)</option>
              <option value="forgot_checkout">Forgot to check out</option>
              <option value="missing">Missing day (I worked, nothing recorded)</option>
            </FloatSelect>
            <FloatInput id="corr-in" type="time" label="Check in" value={inT} onChange={(e) => setInT(e.target.value)} />
            <FloatInput id="corr-out" type="time" label="Check out" value={outT} onChange={(e) => setOutT(e.target.value)} />
            <FloatInput id="corr-reason" label="Reason" hint="What happened. Shown to the admin who reviews it." value={reason} onChange={(e) => setReason(e.target.value)} wrapClassName="col-span-2" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit request"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
