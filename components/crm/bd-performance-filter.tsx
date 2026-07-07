"use client";
// BD Performance toolbar: range presets (This week / This month / Last 3 months / Custom),
// custom date pickers, and a BD selector to drill into one BD. Navigates via the shared
// FilterShell transition so the spinner shows over the dashboard while it reloads.
import { usePathname, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { FloatSelect } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/lib/time";
import { useFilterTransition } from "./filter-shell";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "3m", label: "Last 3 months" },
];
const seg = "rounded-md px-3 py-1 text-caption font-medium transition-colors";
const on = "bg-white text-brand-primary shadow-card";
const off = "text-text-secondary hover:text-text-primary";

export function BdPerformanceFilter({
  range,
  from,
  to,
  bd,
  bds,
}: {
  range: RangeKey;
  from: string;
  to: string;
  bd: string;
  bds: { id: string; full_name: string }[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();

  function go(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    nav(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FloatSelect label="BD" value={bd} onChange={(e) => go({ bd: e.target.value })} wrapClassName="w-52">
        <option value="">All BDs</option>
        {bds.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
      </FloatSelect>

      {range === "custom" && (
        <div className="flex items-center gap-1.5">
          <DatePicker value={from} max={to || undefined} onChange={(v) => go({ range: "custom", from: v, to })} className="h-9 w-36 px-2 text-caption" placeholder="From" />
          <span className="text-caption text-text-secondary">to</span>
          <DatePicker value={to} min={from || undefined} onChange={(v) => go({ range: "custom", from, to: v })} className="h-9 w-36 px-2 text-caption" placeholder="To" />
        </div>
      )}

      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => go({ range: p.key, from: undefined, to: undefined })} className={cn(seg, range === p.key ? on : off)}>{p.label}</button>
        ))}
        <button onClick={() => go({ range: "custom", from, to })} className={cn(seg, range === "custom" ? on : off)}>Custom</button>
      </div>
    </div>
  );
}
