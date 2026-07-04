"use client";
// Received-date range filter for the Interviews/Assessments grids: quick presets (1wk / 1mo / 3mo) as
// a segmented control + an optional custom range. Pushes ?from&to (YYYY-MM-DD). Default = 1 month.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// YYYY-MM-DD `days` before today in Asia/Karachi (UTC+5, no DST).
function daysAgo(days: number): string {
  const d = new Date(Date.now() + 5 * 3600_000);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
const todayPkt = () => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);

const PRESETS = [
  { key: "1w", label: "1 week", days: 7 },
  { key: "1m", label: "1 month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
] as const;

export function CrmDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function push(next: { from?: string; to?: string }) {
    const sp = new URLSearchParams(params.toString());
    const f = next.from ?? from;
    const t = next.to ?? to;
    if (f) sp.set("from", f); else sp.delete("from");
    if (t) sp.set("to", t); else sp.delete("to");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  // No explicit range → 1 month is the active default (the grid defaults the same window server-side).
  const activePreset = !from && !to ? "1m" : PRESETS.find((p) => from === daysAgo(p.days) && (to === "" || to === todayPkt()))?.key;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="text-caption font-medium text-text-secondary">Received</span>
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => push({ from: daysAgo(p.days), to: todayPkt() })}
              className={cn(
                "rounded-md px-3 py-1 text-caption font-medium transition-colors",
                activePreset === p.key ? "bg-white text-brand-primary shadow-card" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <label htmlFor="crm-from" className="sr-only">From date</label>
        <input
          id="crm-from" type="date" value={from} max={to || undefined}
          onChange={(e) => push({ from: e.target.value })}
          className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
        <span className="text-caption text-text-secondary">–</span>
        <label htmlFor="crm-to" className="sr-only">To date</label>
        <input
          id="crm-to" type="date" value={to} min={from || undefined}
          onChange={(e) => push({ to: e.target.value })}
          className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
        {(from || to) && (
          <button
            onClick={() => {
              const sp = new URLSearchParams(params.toString());
              sp.delete("from"); sp.delete("to"); sp.delete("page");
              const qs = sp.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
            className="h-8 rounded-md border border-border px-2.5 text-caption text-text-secondary hover:bg-surface"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
