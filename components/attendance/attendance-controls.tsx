"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
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
    <div className="flex flex-wrap items-center gap-3">
      <FloatSelect
        id="att-employee"
        label="Employee"
        hint="Whose attendance to show. Choose All employees for the whole team."
        value={employeeId}
        onChange={(e) => set({ employeeId: e.target.value })}
        wrapClassName="w-60"
      >
        <option value="">All employees</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.full_name}{e.employee_code ? ` (#${e.employee_code})` : ""}
          </option>
        ))}
      </FloatSelect>

      {/* segmented range control, same height as the fields (h-10) */}
      <div className="inline-flex h-10 items-center rounded-md border border-border bg-surface p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => set({ range: r })}
            className={cn(
              "h-full rounded px-3 text-caption font-medium transition-colors",
              range === r ? "bg-white text-brand-primary shadow-card" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker id="att-from" label="From" hint="Start of the range." value={from} max={to || undefined} onChange={(v) => set({ from: v })} className="w-40" />
          <DatePicker id="att-to" label="To" hint="End of the range." value={to} min={from || undefined} onChange={(v) => set({ to: v })} className="w-40" />
        </div>
      )}
    </div>
  );
}
