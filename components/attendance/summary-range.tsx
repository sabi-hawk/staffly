"use client";
// Date-range picker for the employee attendance summary. Presets: This month (default) / Last 3 months.
// Admins additionally get a Custom range (any from–to). Writes ?range&from&to for the server page.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/lib/time";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "3m", label: "Last 3 months" },
];
const seg = "rounded-md px-3 py-1 text-caption font-medium transition-colors";
const on = "bg-white text-brand-primary shadow-card";
const off = "text-text-secondary hover:text-text-primary";

export function SummaryRange({ range, from, to, allowCustom }: { range: RangeKey; from: string; to: string; allowCustom: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function nav(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) { if (v) sp.set(k, v); else sp.delete(k); }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => nav({ range: p.key, from: undefined, to: undefined })} className={cn(seg, range === p.key ? on : off)}>
            {p.label}
          </button>
        ))}
        {allowCustom && (
          <button onClick={() => nav({ range: "custom" })} className={cn(seg, range === "custom" ? on : off)}>Custom</button>
        )}
      </div>
      {allowCustom && range === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} max={to || undefined} onChange={(e) => nav({ range: "custom", from: e.target.value, to })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" />
          <span className="text-caption text-text-secondary">–</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => nav({ range: "custom", from, to: e.target.value })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" />
        </div>
      )}
    </div>
  );
}
