"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WorkLogEditor } from "@/components/work-log-editor";
import { formatHours } from "@/lib/utils";

interface Today {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  expected_hours: number | null;
}

export function CheckWidget({ today }: { today: Today | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [workLog, setWorkLog] = useState<unknown>(null);
  const [elapsed, setElapsed] = useState("");

  const isWorking = !!today?.check_in_time && !today?.check_out_time;
  const isDone = !!today?.check_out_time;

  useEffect(() => {
    if (!isWorking || !today?.check_in_time) return;
    const tick = () => {
      const ms = Date.now() - new Date(today.check_in_time!).getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setElapsed(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [isWorking, today?.check_in_time]);

  async function checkIn() {
    setBusy(true);
    const res = await fetch("/api/attendance/check-in", { method: "POST" });
    setBusy(false);
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Check-in failed");
    toast.success(json.alreadyCheckedIn ? "Already checked in today" : json.late ? "Checked in (late)" : "Checked in — have a great day!");
    router.refresh();
  }

  async function checkOut() {
    setBusy(true);
    const res = await fetch("/api/attendance/check-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ work_log: workLog }),
    });
    setBusy(false);
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Check-out failed");
    toast.success("Checked out — work log saved");
    setShowCheckout(false);
    router.refresh();
  }

  const statusKind = isWorking
    ? today?.status === "late" ? "late" : "working"
    : isDone ? "done" : "awaiting";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-text-secondary">Today</p>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge status={statusKind as any} />
            {isWorking && <span className="tabular text-h2 text-text-primary">{elapsed}</span>}
          </div>
          {today?.expected_hours != null && (
            <p className="mt-1 text-caption text-text-secondary">
              Expected {formatHours(today.expected_hours)} today
            </p>
          )}
        </div>
        <div>
          {!today?.check_in_time && (
            <Button onClick={checkIn} disabled={busy} size="lg" variant="success">
              Start my day
            </Button>
          )}
          {isWorking && (
            <Button onClick={() => setShowCheckout(true)} disabled={busy} size="lg" variant="danger">
              End my day
            </Button>
          )}
          {isDone && <span className="text-caption text-text-secondary">See you tomorrow 👋</span>}
        </div>
      </div>

      {showCheckout && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-h3">What did you work on today?</p>
          <WorkLogEditor value={workLog} onChange={setWorkLog} />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={checkOut} disabled={busy}>
              Confirm checkout
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
