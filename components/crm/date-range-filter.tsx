"use client";
// Date-range filter for BD analytics. Pushes ?from&to into the URL; the server page re-reads them.
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function apply(next: { from?: string; to?: string }) {
    const sp = new URLSearchParams(params.toString());
    const f = next.from ?? from;
    const t = next.to ?? to;
    if (f) sp.set("from", f); else sp.delete("from");
    if (t) sp.set("to", t); else sp.delete("to");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="analytics-from">From</Label>
        <DatePicker
          id="analytics-from"
          value={from}
          max={to || undefined}
          onChange={(v) => apply({ from: v })}
          className="w-40 shadow-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="analytics-to">To</Label>
        <DatePicker
          id="analytics-to"
          value={to}
          min={from || undefined}
          onChange={(v) => apply({ to: v })}
          className="w-40 shadow-sm"
        />
      </div>
      {(from || to) && (
        <button
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            sp.delete("from");
            sp.delete("to");
            const qs = sp.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
          className="h-9 rounded-md border border-border px-3 text-sm text-text-secondary hover:bg-surface"
        >
          Clear
        </button>
      )}
    </div>
  );
}
