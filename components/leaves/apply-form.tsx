"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function LeaveApplyForm() {
  const router = useRouter();
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      toast.warning(`Annual quota exceeded — ${json.unpaidPart} day(s) filed as unpaid.`);
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
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm"
              >
                <option value="annual">Annual (8/yr)</option>
                <option value="casual">Casual (1/mo)</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <p className="text-caption text-text-secondary">
            Annual: 8/year, request at least 21 days ahead. Casual: max 1 day per month.
            Unpaid: unlimited (deducted).
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
