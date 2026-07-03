"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, type RangeKey } from "@/lib/time";

const RANGES: RangeKey[] = ["3w", "1m", "3m", "custom"];

export function AttendanceControls({
  employees,
  employeeId,
  range,
  from,
  to,
}: {
  employees: { id: string; full_name: string; employee_code: string | null }[];
  employeeId: string;
  range: RangeKey;
  from: string;
  to: string;
}) {
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
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="att-employee" className="block text-caption font-medium text-text-primary">Employee</Label>
        <select
          id="att-employee"
          value={employeeId}
          onChange={(e) => set({ employeeId: e.target.value })}
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} {e.employee_code ? `(#${e.employee_code})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <span className="block text-caption font-medium text-text-primary">Range</span>
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
      </div>

      {range === "custom" && (
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="att-from" className="block text-caption font-medium text-text-primary">From</Label>
            <Input id="att-from" type="date" defaultValue={from} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-to" className="block text-caption font-medium text-text-primary">To</Label>
            <Input id="att-to" type="date" defaultValue={to} onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
