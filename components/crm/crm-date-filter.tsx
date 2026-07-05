"use client";
// Date-range control for the CRM grids (Leads / Interviews / Assessments): preset tabs on the right —
// Last 30 days (default) / Last 3 months / Custom — matching the attendance summary style. The grid
// renders the resolved "from → to (inclusive)" range to the LEFT of this. Writes ?range (+ from/to for
// custom) and navigates via the shared FilterShell transition (spinner over the grid).
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/lib/time";
import { useFilterTransition } from "./filter-shell";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "1m", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
];
const seg = "rounded-md px-3 py-1 text-caption font-medium transition-colors";
const on = "bg-white text-brand-primary shadow-card";
const off = "text-text-secondary hover:text-text-primary";

export function CrmDateFilter({ range, from, to }: { range: RangeKey; from: string; to: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();

  function go(next: { range: RangeKey; from?: string; to?: string }) {
    const sp = new URLSearchParams(params.toString());
    sp.set("range", next.range);
    if (next.range === "custom") {
      if (next.from) sp.set("from", next.from); else sp.delete("from");
      if (next.to) sp.set("to", next.to); else sp.delete("to");
    } else { sp.delete("from"); sp.delete("to"); }
    sp.delete("page");
    nav(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {range === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} max={to || undefined} onChange={(e) => go({ range: "custom", from: e.target.value, to })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" />
          <span className="text-caption text-text-secondary">–</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => go({ range: "custom", from, to: e.target.value })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" />
        </div>
      )}
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => go({ range: p.key })} className={cn(seg, range === p.key ? on : off)}>{p.label}</button>
        ))}
        <button onClick={() => go({ range: "custom", from, to })} className={cn(seg, range === "custom" ? on : off)}>Custom</button>
      </div>
    </div>
  );
}
