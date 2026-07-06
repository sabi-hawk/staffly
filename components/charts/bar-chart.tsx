// Grouped vertical bar chart — pure server-rendered SVG (no chart library, no client JS).
// data = one group per x-label (e.g. a BD), each with one value per series.
export type BarSeries = { name: string; color: string };
export type BarGroup = { label: string; values: number[] };

export function BarChart({ groups, series, height = 220 }: { groups: BarGroup[]; series: BarSeries[]; height?: number }) {
  if (!groups.length) return <p className="py-6 text-center text-caption text-text-secondary">No data in this range.</p>;
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const groupW = 400 / groups.length;
  const barW = Math.min(36, (groupW * 0.7) / series.length);
  const plotH = height - 42; // room for x labels
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div>
      <svg viewBox={`0 0 400 ${height}`} className="h-auto w-full" role="img" aria-label="Bar chart">
        {ticks.map((t, i) => {
          const y = 8 + plotH - (t / max) * plotH;
          return <line key={i} x1="0" x2="400" y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {groups.map((g, gi) =>
          g.values.map((v, si) => {
            const h = (v / max) * plotH;
            const x = gi * groupW + (groupW - barW * series.length) / 2 + si * barW;
            return (
              <rect key={`${gi}-${si}`} x={x} y={8 + plotH - h} width={barW - 3} height={h}
                rx="2" fill={series[si].color}>
                <title>{`${g.label} — ${series[si].name}: ${v}`}</title>
              </rect>
            );
          })
        )}
        {groups.map((g, gi) => (
          <text key={gi} x={gi * groupW + groupW / 2} y={height - 22} textAnchor="middle"
            style={{ fontSize: 11, fill: "#6b7280" }}>
            {g.label.length > 14 ? g.label.slice(0, 13) + "…" : g.label}
          </text>
        ))}
        {groups.map((g, gi) =>
          g.values.map((v, si) => {
            if (!v) return null;
            const h = (v / max) * plotH;
            const x = gi * groupW + (groupW - barW * series.length) / 2 + si * barW + (barW - 3) / 2;
            return (
              <text key={`v${gi}-${si}`} x={x} y={8 + plotH - h - 4} textAnchor="middle" style={{ fontSize: 10, fill: "#374151" }}>
                {v}
              </text>
            );
          })
        )}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
