"use client";
// Date-range control for the CRM grids: an optional custom range followed by quick presets
// (1wk / 1mo / 3mo), meant to sit at the right of the toolbar row. No "Received" label — the range
// is understood to bound the grid. Pushes ?from&to (YYYY-MM-DD). Navigates via the shared FilterShell
// transition so the spinner shows over the grid. `defaultAll` (Leads) adds an "All" segment and treats
// an empty range as All; without it (Interviews/Assessments) an empty range means the 1-month default.
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { crmDaysAgo as daysAgo, crmToday as todayPkt } from "@/lib/crm/date-utils";
import { useFilterTransition } from "./filter-shell";

const PRESETS = [
  { key: "1w", label: "1 week", days: 7 },
  { key: "1m", label: "1 month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
] as const;

export function CrmDateFilter({ defaultAll = false }: { defaultAll?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function push(next: { from?: string; to?: string }) {
    const sp = new URLSearchParams(params.toString());
    const f = next.from ?? from;
    const t = next.to ?? to;
    if (f) sp.set("from", f); else sp.delete("from");
    if (t) sp.set("to", t); else sp.delete("to");
    sp.delete("page");
    const qs = sp.toString();
    nav(qs ? `${pathname}?${qs}` : pathname);
  }
  const clearRange = () => push({ from: "", to: "" });

  const empty = !from && !to;
  // Which preset (if any) is currently active. Empty range → 1-month default, or "all" when defaultAll.
  const activePreset = empty
    ? (defaultAll ? "all" : "1m")
    : PRESETS.find((p) => from === daysAgo(p.days) && (to === "" || to === todayPkt()))?.key;

  const seg = "rounded-md px-3 py-1 text-caption font-medium transition-colors";
  const on = "bg-white text-brand-primary shadow-card";
  const off = "text-text-secondary hover:text-text-primary";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Custom range (before the presets) */}
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
      </div>

      {/* Quick presets (rightmost) */}
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {defaultAll && (
          <button onClick={clearRange} className={cn(seg, activePreset === "all" ? on : off)}>All</button>
        )}
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => push({ from: daysAgo(p.days), to: todayPkt() })}
            className={cn(seg, activePreset === p.key ? on : off)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
