"use client";
// Grouped vertical bar chart (recharts). Categorical series in a FIXED order (never cycled). Optional
// drill-down: clicking a bar sets `?<drilldownParam>=<group id>` so the page re-scopes to that entity.
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export type BarSeries = { name: string; color: string };
export type BarGroup = { label: string; values: number[]; id?: string };

const AXIS = "#9ca3af";
const truncate = (v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-caption shadow-soft">
      <div className="mb-1 font-medium text-text-primary">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}</span>
          <span className="ml-auto font-medium text-text-primary tabular">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BarChart({ groups, series, height = 260, drilldownParam }: { groups: BarGroup[]; series: BarSeries[]; height?: number; drilldownParam?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const data = groups.map((g) => ({ label: g.label, id: g.id, ...Object.fromEntries(series.map((s, i) => [s.name, g.values[i] ?? 0])) }));
  const drill = (index: number) => {
    const id = data[index]?.id;
    if (!drilldownParam || !id) return;
    const p = new URLSearchParams(Array.from(sp.entries()));
    p.set(drilldownParam, id);
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap="26%">
          <CartesianGrid vertical={false} stroke="#eef0f2" />
          <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={truncate} />
          <YAxis allowDecimals={false} width={30} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
          <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          {series.map((s) => (
            <Bar key={s.name} dataKey={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={30}
              cursor={drilldownParam ? "pointer" : undefined} onClick={(_: any, index: number) => drill(index)} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
      {drilldownParam && <p className="mt-1 text-center text-[11px] text-text-secondary">Click a bar to drill into a BD.</p>}
    </>
  );
}
