"use client";
// Date-range picker for the employee attendance summary. Presets: This month (default) / Last 3 months.
// Admins additionally get a Custom range (any from–to). Writes ?range&from&to for the server page.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/lib/time";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "3m", label: "Last 3 months" },
];
const seg = "rounded-md px-3 py-1 text-caption font-medium transition-colors";
const on = "bg-white text-brand-primary shadow-card";
const off = "text-text-secondary hover:text-text-primary";

export function SummaryRange({ range, from, to, allowCustom, minFrom }: { range: RangeKey; from: string; to: string; allowCustom: boolean; minFrom?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const todayStr = to && range !== "custom" ? to : new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);

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
          <DatePicker value={from} min={minFrom} max={to || todayStr} onChange={(v) => nav({ range: "custom", from: v, to })}
            placeholder="From" className="h-8 w-36 px-2 text-caption" />
          <span className="text-caption text-text-secondary">–</span>
          <DatePicker value={to} min={from || minFrom} max={todayStr} onChange={(v) => nav({ range: "custom", from, to: v })}
            placeholder="To" className="h-8 w-36 px-2 text-caption" />
        </div>
      )}
    </div>
  );
}
