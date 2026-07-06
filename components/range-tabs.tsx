"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, type RangeKey } from "@/lib/time";

const RANGES: RangeKey[] = ["3w", "1m", "3m", "custom"];

/** Range quick-tabs + custom date range, URL-driven (?range,from,to). Resets ?page. */
export function RangeTabs({ range, from, to }: { range: RangeKey; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    sp.set("page", "1");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="inline-flex rounded-md border border-border bg-white p-0.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => set({ range: r })}
            className={cn(
              "rounded px-3 py-1.5 text-caption font-medium transition-colors",
              range === r ? "bg-brand-light text-brand-primary" : "text-text-secondary hover:bg-surface"
            )}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex items-end gap-2">
          <DatePicker value={from} onChange={(v) => set({ from: v })} className="w-40" />
          <span className="pb-2 text-text-secondary">→</span>
          <DatePicker value={to} onChange={(v) => set({ to: v })} className="w-40" />
        </div>
      )}
    </div>
  );
}
