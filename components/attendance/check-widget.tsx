"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";

interface Session { id: string; started_at: string; ended_at: string | null }
interface Today {
  attendance: { status: string; expected_hours: number | null } | null;
  sessions: Session[];
  completedSeconds: number;
  openSince: string | null;
}

function fmt(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}
const time = (t: string) => new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

export function CheckWidget({ today, summaryMissing }: { today: Today; summaryMissing?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const working = !!today.openSince;
  const [elapsed, setElapsed] = useState(today.completedSeconds);

  useEffect(() => {
    if (!working || !today.openSince) {
      setElapsed(today.completedSeconds);
      return;
    }
    const base = today.completedSeconds;
    const start = new Date(today.openSince).getTime();
    const tick = () => setElapsed(base + (Date.now() - start) / 1000);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [working, today.openSince, today.completedSeconds]);

  async function act(path: string, okMsg: string) {
    setBusy(true);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    if (path.includes("check-in")) toast.success(json.alreadyCheckedIn ? "Already working" : json.late ? "Checked in (late)" : "Checked in");
    else {
      toast.success(okMsg);
      // Nudge on checkout while today's summary is still missing (suppressed once it's added).
      if (summaryMissing) {
        toast.warning("Done for the day? Don't forget to add today's task summary.", { duration: 6000 });
      }
    }
    router.refresh();
  }

  const statusKind = working ? (today.attendance?.status === "late" ? "late" : "working") : today.sessions.length ? "done" : "awaiting";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-caption text-text-secondary">Today {working ? "· working" : today.sessions.length ? "· on break / done" : ""}</p>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge status={statusKind as any} />
            <span className="tabular text-display text-text-primary">{fmt(elapsed)}</span>
          </div>
          {today.attendance?.expected_hours != null && (
            <p className="mt-1 text-caption text-text-secondary">
              Expected {formatHours(today.attendance.expected_hours)} · {today.sessions.length} session{today.sessions.length === 1 ? "" : "s"} today
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {working ? (
            <Button onClick={() => act("/api/attendance/check-out", "Checked out")} disabled={busy} size="lg" variant="danger">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Checking out…</> : "Check out"}
            </Button>
          ) : (
            <Button onClick={() => act("/api/attendance/check-in", "Checked in")} disabled={busy} size="lg" variant="success">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Checking in…</> : today.sessions.length ? "Resume (check in)" : "Check in"}
            </Button>
          )}
        </div>
      </div>

      {today.sessions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {today.sessions.map((s, i) => (
            <span key={s.id} className="rounded-md border border-border px-2 py-1 text-caption text-text-secondary tabular">
              #{i + 1} {time(s.started_at)} → {s.ended_at ? time(s.ended_at) : "now"}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
