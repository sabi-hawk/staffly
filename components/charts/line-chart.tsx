// Multi-series line chart — pure server-rendered SVG (no chart library, no client JS).
// points = one entry per x bucket (e.g. a week), each with one value per series.
export type LineSeries = { name: string; color: string };
export type LinePoint = { label: string; values: number[] };

export function LineChart({ points, series, height = 200 }: { points: LinePoint[]; series: LineSeries[]; height?: number }) {
  if (points.length < 2) return <p className="py-6 text-center text-caption text-text-secondary">Not enough data in this range for a trend.</p>;
  const max = Math.max(1, ...points.flatMap((p) => p.values));
  const plotH = height - 34;
  const x = (i: number) => 16 + (i / (points.length - 1)) * 368;
  const y = (v: number) => 8 + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <div>
      <svg viewBox={`0 0 400 ${height}`} className="h-auto w-full" role="img" aria-label="Line chart">
        {ticks.map((t, i) => (
          <line key={i} x1="0" x2="400" y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {series.map((s, si) => (
          <polyline key={s.name} points={points.map((p, i) => `${x(i)},${y(p.values[si])}`).join(" ")}
            fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s, si) =>
          points.map((p, i) => (
            <circle key={`${si}-${i}`} cx={x(i)} cy={y(p.values[si])} r="4" fill={s.color}>
              <title>{`${p.label} — ${s.name}: ${p.values[si]}`}</title>
            </circle>
          ))
        )}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={height - 14} textAnchor="middle" style={{ fontSize: 11, fill: "#6b7280" }}>
            {p.label}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
