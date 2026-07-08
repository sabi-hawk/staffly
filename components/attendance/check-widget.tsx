"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { companyToday } from "@/lib/time";
import { CorrectionRequest } from "@/components/attendance/correction-request";

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

  // Keep the button in its loading state through the server refresh (below), so it flips straight from
  // the spinner to the OTHER action — never flashing back to "Resume (check in)" for a beat. `today`
  // gets a fresh reference on each server re-render, so this clears busy once the new state has landed.
  useEffect(() => { setBusy(false); }, [today]);

  async function act(path: string, okMsg: string) {
    setBusy(true);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return toast.error(json.error ?? "Failed"); }
    if (path.includes("check-in")) toast.success(json.alreadyCheckedIn ? "Already working" : json.late ? "Checked in (late)" : "Checked in");
    else {
      toast.success(okMsg);
      // Nudge on checkout while today's summary is still missing (suppressed once it's added).
      if (summaryMissing) {
        toast.warning("Done for the day? Don't forget to add today's task summary.", { duration: 6000 });
      }
    }
    // Do NOT clear busy here — the useEffect above clears it after the refreshed props arrive, so the
    // button stays "Checking in…/out…" until it can render the correct next action.
    router.refresh();
  }

  const statusKind = working ? (today.attendance?.status === "late" ? "late" : "working") : today.sessions.length ? "done" : "awaiting";

  // "Something's off": the session is still open but started on a PAST day → they forgot to check out.
  // The live timer would keep climbing; offer to stop & submit the real check-out for admin approval.
  const openDate = today.openSince ? companyToday(new Date(today.openSince)) : null;
  const staleOpen = working && !!openDate && openDate < companyToday();
  const openTime = today.openSince ? new Date(today.openSince).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "";

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
            <Button onClick={() => act("/api/attendance/check-out", "Checked out")} disabled={busy} size="lg" variant="danger" className="border-0 bg-danger text-white hover:bg-danger/90">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Checking out…</> : "Check out"}
            </Button>
          ) : (
            <Button onClick={() => act("/api/attendance/check-in", "Checked in")} disabled={busy} size="lg" variant="success" className="border-0 bg-success text-white hover:bg-success/90">
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

      {staleOpen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2.5">
          <p className="text-caption text-text-primary">
            <span className="font-medium text-danger">Still checked in from {openDate}.</span>{" "}
            <span className="text-text-secondary">Looks like a missed checkout — the timer keeps running. Submit the real check-out for approval.</span>
          </p>
          <CorrectionRequest
            triggerLabel="Stop &amp; correct"
            variant="danger"
            defaultDate={openDate!}
            defaultKind="forgot_checkout"
            defaultIn={openTime}
          />
        </div>
      )}
    </Card>
  );
}
