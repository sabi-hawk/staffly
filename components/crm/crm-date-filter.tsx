"use client";
// Received-date range filter for the Interviews/Assessments grids: quick presets (1wk / 1mo / 3mo)
// + a custom range. Pushes ?from&to (YYYY-MM-DD) into the URL; the server tab re-queries.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/input";

// Compute a YYYY-MM-DD `days` before today in Asia/Karachi (UTC+5, no DST).
function daysAgo(days: number): string {
  const nowPkt = new Date(Date.now() + 5 * 3600_000);
  nowPkt.setUTCDate(nowPkt.getUTCDate() - days);
  return nowPkt.toISOString().slice(0, 10);
}
function todayPkt(): string {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
}

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

  // A preset is "active" when from = today-Ndays and to is today/empty.
  const activePreset = PRESETS.find((p) => from === daysAgo(p.days) && (to === "" || to === todayPkt()))?.key;

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => push({ from: daysAgo(p.days), to: todayPkt() })}
            className={cn(
              "h-8 rounded-md border px-3 text-caption font-medium transition-colors",
              activePreset === p.key
                ? "border-brand-primary bg-brand-light text-brand-primary"
                : "border-border text-text-secondary hover:bg-surface"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="crm-from" className="text-caption text-text-secondary">From</Label>
          <input
            id="crm-from" type="date" value={from} max={to || undefined}
            onChange={(e) => push({ from: e.target.value })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="crm-to" className="text-caption text-text-secondary">To</Label>
          <input
            id="crm-to" type="date" value={to} min={from || undefined}
            onChange={(e) => push({ to: e.target.value })}
            className="h-8 rounded-md border border-border bg-white px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              const sp = new URLSearchParams(params.toString());
              sp.delete("from"); sp.delete("to"); sp.delete("page");
              const qs = sp.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
            className="h-8 rounded-md border border-border px-3 text-caption text-text-secondary hover:bg-surface"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
