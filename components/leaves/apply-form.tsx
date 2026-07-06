"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function LeaveApplyForm({ dealDev = false }: { dealDev?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return toast.error("Start and end dates are required");
    setBusy(true);
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, start, end, reason }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    if (json.overflowOffered)
      toast.warning(`Annual quota exceeded. ${json.unpaidPart} day(s) filed as unpaid.`);
    else toast.success("Leave request submitted");
    setStart(""); setEnd(""); setReason("");
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
              onChange={(e) => setType(e.target.value)}
            >
              <option value="annual">{dealDev ? "Annual" : "Annual (8/yr)"}</option>
              <option value="casual">{dealDev ? "Casual" : "Casual (1/mo)"}</option>
              <option value="unpaid">Unpaid</option>
            </FloatSelect>
            <FloatInput
              id="apply-reason"
              label="Reason"
              hint="Optional note for whoever reviews the request."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <DatePicker
              id="apply-start"
              label="Start"
              hint="First day of the leave."
              value={start}
              onChange={setStart}
            />
            <DatePicker
              id="apply-end"
              label="End"
              hint="Last day of the leave. Same as start for a single day."
              value={end}
              onChange={setEnd}
            />
          </div>
          <p className="text-caption text-text-secondary">
            {dealDev
              ? "Recorded for our log. The client company you work for governs your leave. An admin confirms it."
              : "Annual: 8/year, request at least 21 days ahead. Casual: max 1 day per month. Unpaid: unlimited (deducted)."}
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
