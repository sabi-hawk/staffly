"use client";
// Multi-series trend chart (recharts area/line). Categorical series in a FIXED order. Soft area fills
// under thin 2px lines, recessive grid, per-point hover tooltip, legend.
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export type LineSeries = { name: string; color: string };
export type LinePoint = { label: string; values: number[] };

const AXIS = "#9ca3af";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-caption shadow-soft">
      <div className="mb-1 font-medium text-text-primary">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}</span>
          <span className="ml-auto font-medium text-text-primary tabular">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, series, height = 260 }: { points: LinePoint[]; series: LineSeries[]; height?: number }) {
  const data = points.map((p) => ({ label: p.label, ...Object.fromEntries(series.map((s, i) => [s.name, p.values[i] ?? 0])) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.name} id={`grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="#eef0f2" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis allowDecimals={false} width={30} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        {series.map((s) => (
          <Area key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2}
            fill={`url(#grad-${s.name})`} dot={{ r: 3, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
