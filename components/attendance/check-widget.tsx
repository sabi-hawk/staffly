"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Clock, LogIn, LogOut } from "lucide-react";
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
  return { h, m: String(m).padStart(2, "0"), s: String(sec).padStart(2, "0") };
}
const time = (t: string) => new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

export function CheckWidget({ today, summaryMissing }: { today: Today; summaryMissing?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const working = !!today.openSince;
  const [elapsed, setElapsed] = useState(today.completedSeconds);
  const [now, setNow] = useState<Date | null>(null); // live wall clock (client-only, avoids SSR mismatch)

  useEffect(() => {
    setNow(new Date());
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

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

  useEffect(() => { setBusy(false); }, [today]);

  async function act(path: string, okMsg: string) {
    setBusy(true);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return toast.error(json.error ?? "Failed"); }
    if (path.includes("check-in")) toast.success(json.alreadyCheckedIn ? "Already working" : json.late ? "Checked in (late)" : "Checked in");
    else {
      toast.success(okMsg);
      if (summaryMissing) toast.warning("Done for the day? Don't forget to add today's task summary.", { duration: 6000 });
    }
    router.refresh();
  }

  const late = today.attendance?.status === "late";
  // Clock-style status: on the clock (working) / clocked out (has sessions, stopped) / off the clock (none).
  const status = working
    ? { label: late ? "On the clock · late" : "On the clock", dot: late ? "bg-amber-300" : "bg-emerald-300", pulse: true }
    : today.sessions.length
      ? { label: "Clocked out", dot: "bg-white/60", pulse: false }
      : { label: "Off the clock", dot: "bg-white/50", pulse: false };

  const t = fmt(elapsed);
  const dateLine = now
    ? now.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long" })
    : "";
  const clockLine = now
    ? now.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })
    : "";

  const openDate = today.openSince ? companyToday(new Date(today.openSince)) : null;
  const staleOpen = working && !!openDate && openDate < companyToday();
  const openTime = today.openSince ? new Date(today.openSince).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="space-y-3">
      {/* ── Hero time-clock ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-primary p-6 text-white shadow-soft sm:p-7">
        {/* depth + glow (hue-safe overlays) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25" />
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-white/80">
                <Clock className="size-4" /> Time clock
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                <span className={`size-1.5 rounded-full ${status.dot} ${status.pulse ? "animate-pulse" : ""}`} />
                {status.label}
              </span>
            </div>

            <div className="mt-3 flex items-end gap-1.5 font-semibold leading-none tabular-nums">
              <span className="text-5xl sm:text-6xl">{t.h}</span><span className="mb-0.5 text-xl text-white/70">h</span>
              <span className="ml-1 text-5xl sm:text-6xl">{t.m}</span><span className="mb-0.5 text-xl text-white/70">m</span>
              <span className="ml-1 text-3xl text-white/80">{t.s}</span><span className="mb-0.5 text-base text-white/60">s</span>
            </div>

            <p className="mt-2.5 text-caption text-white/75">
              {dateLine && <>{dateLine} · {clockLine}</>}
              {today.attendance?.expected_hours != null && <> · expected {formatHours(today.attendance.expected_hours)}</>}
              {today.sessions.length > 0 && <> · {today.sessions.length} session{today.sessions.length === 1 ? "" : "s"}</>}
            </p>
          </div>

          {working ? (
            <button onClick={() => act("/api/attendance/check-out", "Checked out")} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-red-600 shadow-lg shadow-black/10 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70">
              {busy ? <><Loader2 className="size-5 animate-spin" /> Checking out…</> : <><LogOut className="size-5" /> Check out</>}
            </button>
          ) : (
            <button onClick={() => act("/api/attendance/check-in", "Checked in")} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-emerald-700 shadow-lg shadow-black/10 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70">
              {busy ? <><Loader2 className="size-5 animate-spin" /> Checking in…</> : <><LogIn className="size-5" /> {today.sessions.length ? "Resume" : "Check in"}</>}
            </button>
          )}
        </div>

        {today.sessions.length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
            {today.sessions.map((s, i) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-1 text-caption tabular-nums text-white/90 backdrop-blur-sm">
                <span className="text-white/50">#{i + 1}</span> {time(s.started_at)} → {s.ended_at ? time(s.ended_at) : <span className="font-medium text-emerald-200">now</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Missed-checkout recovery (kept as a light alert below the hero) */}
      {staleOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2.5">
          <p className="text-caption text-text-primary">
            <span className="font-medium text-danger">Still checked in from {openDate}.</span>{" "}
            <span className="text-text-secondary">Looks like a missed checkout — the timer keeps running. Submit the real check-out for approval.</span>
          </p>
          <CorrectionRequest triggerLabel="Stop &amp; correct" variant="danger" defaultDate={openDate!} defaultKind="forgot_checkout" defaultIn={openTime} />
        </div>
      )}
    </div>
  );
}
