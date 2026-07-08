"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { companyToday } from "@/lib/time";

// Backdate window (owner): you can file leave for a missed day up to 7 days back; older needs an admin.
const BACKDATE_DAYS = 7;

export function LeaveApplyForm({ dealDev = false }: { dealDev?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState("annual");
  const [duration, setDuration] = useState("full"); // full | half (half only for casual/unpaid)
  const [halfPeriod, setHalfPeriod] = useState("first"); // first | second
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { casualPart: number; unpaidPart: number }>(null);

  const canHalf = type === "casual" || type === "unpaid";
  const isHalf = canHalf && duration === "half";
  // Backdate floor (today - 7 days) as YYYY-MM-DD in Asia/Karachi.
  const minDate = companyToday(new Date(new Date(`${companyToday()}T00:00:00+05:00`).getTime() - BACKDATE_DAYS * 86_400_000));

  async function post(allowUnpaidFallback: boolean) {
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        start,
        end: isHalf ? start : end,
        reason,
        half_day: isHalf,
        half_period: halfPeriod,
        allow_unpaid_fallback: allowUnpaidFallback,
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed"); return null; }
    return json;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || (!isHalf && !end)) return toast.error(isHalf ? "Pick the day" : "Start and end dates are required");
    setBusy(true);
    const json = await post(false);
    setBusy(false);
    if (!json) return;
    // No casual left → confirm the unpaid fallback before creating anything.
    if (json.needsUnpaidConfirm) {
      setConfirm({ casualPart: json.casualPart, unpaidPart: json.unpaidPart });
      return;
    }
    finishOk(json);
  }

  function finishOk(json: any) {
    if (json.unpaidFallback) toast.warning(`No casual left — ${json.unpaidPart} day(s) recorded as unpaid.`);
    else if (json.overflowOffered) toast.warning(`Annual quota exceeded. ${json.unpaidPart} day(s) filed as unpaid.`);
    else toast.success("Leave request submitted");
    setStart(""); setEnd(""); setReason(""); setDuration("full");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply for leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FloatSelect
              id="apply-type"
              label="Type"
              hint="Annual and casual are paid within your quota. Unpaid is always available but deducted from pay."
              value={type}
              onChange={(e) => { setType(e.target.value); if (e.target.value === "annual") setDuration("full"); }}
            >
              <option value="annual">{dealDev ? "Annual" : "Annual (8/yr)"}</option>
              <option value="casual">{dealDev ? "Casual" : "Casual (1/mo)"}</option>
              <option value="unpaid">Unpaid</option>
            </FloatSelect>
            {canHalf ? (
              <FloatSelect
                id="apply-duration"
                label="Duration"
                hint="A half day counts as 0.5. Two half-days on different days use up your one casual day."
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="full">Full day(s)</option>
                <option value="half">Half day</option>
              </FloatSelect>
            ) : (
              <FloatInput
                id="apply-reason"
                label="Reason"
                hint="Optional note for whoever reviews the request."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}

            <DatePicker
              id="apply-start"
              label={isHalf ? "Day" : "Start"}
              hint={`First day of the leave. You can backdate up to ${BACKDATE_DAYS} days to fill a missed day.`}
              value={start}
              min={minDate}
              onChange={setStart}
            />
            {isHalf ? (
              <FloatSelect
                id="apply-half-period"
                label="Which half"
                hint="Morning (first half) or afternoon (second half). You work the other half."
                value={halfPeriod}
                onChange={(e) => setHalfPeriod(e.target.value)}
              >
                <option value="first">First half (morning)</option>
                <option value="second">Second half (afternoon)</option>
              </FloatSelect>
            ) : (
              <DatePicker
                id="apply-end"
                label="End"
                hint="Last day of the leave. Same as start for a single day."
                value={end}
                min={start || minDate}
                onChange={setEnd}
              />
            )}

            {canHalf && (
              <FloatInput
                id="apply-reason-2"
                label="Reason"
                hint="Optional note for whoever reviews the request."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                wrapClassName="col-span-2"
              />
            )}
          </div>
          <p className="text-caption text-text-secondary">
            {dealDev
              ? "Recorded for our log. The client company you work for governs your leave. An admin confirms it."
              : `Annual: 8/year, request at least 21 days ahead. Casual: max 1 day per month (can be two half-days). Unpaid: unlimited (deducted). Backdate up to ${BACKDATE_DAYS} days for a missed day.`}
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </CardContent>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title="No casual leave left"
        description={
          confirm
            ? `You don't have casual leave remaining, so ${confirm.unpaidPart} day(s) will be recorded as UNPAID (deducted from pay)${confirm.casualPart > 0 ? `, with ${confirm.casualPart} day(s) as casual` : ""}. Proceed?`
            : ""
        }
        confirmLabel="Proceed as unpaid"
        tone="danger"
        onConfirm={async () => {
          setBusy(true);
          const json = await post(true);
          setBusy(false);
          setConfirm(null);
          if (json) finishOk(json);
        }}
      />
    </Card>
  );
}
