/** Gráfico de progreso por criterio a lo largo de las sesiones (SVG, sin librerías). */
const SERIES = [
  { key: "correctness", label: "Exactitud", color: "var(--na-available)" },
  { key: "depth", label: "Profundidad", color: "var(--na-progress)" },
  { key: "clarity", label: "Claridad", color: "var(--na-done)" },
  { key: "tradeoffs", label: "Trade-offs", color: "var(--na-warn)" },
] as const;

export type ChartPoint = { id: number; label: string; criteria: Record<string, number> };

export function ProgressChart({ points }: { points: ChartPoint[] }) {
  if (points.length < 2)
    return <p className="text-sm text-dim">Completa al menos 2 sesiones para ver tu progreso por criterio.</p>;
  const W = 600;
  const H = 220;
  const pad = { l: 34, r: 12, t: 12, b: 28 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (v: number) => pad.t + ((100 - v) * (H - pad.t - pad.b)) / 100;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Progreso por criterio">
        {[0, 25, 50, 70, 100].map((g) => (
          <g key={g}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(g)}
              y2={y(g)}
              stroke={g === 70 ? "var(--na-warn)" : "var(--na-border)"}
              strokeDasharray={g === 70 ? "4 4" : undefined}
            />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize={10} fill="var(--na-text-dim)" className="font-mono">
              {g}
            </text>
          </g>
        ))}
        {SERIES.map((s) => {
          const pts = points
            .map((p, i) => (p.criteria[s.key] !== undefined ? `${x(i).toFixed(1)},${y(p.criteria[s.key]).toFixed(1)}` : null))
            .filter(Boolean)
            .join(" ");
          return <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
        {points.map((p, i) => (
          <text key={p.id} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--na-text-dim)" className="font-mono">
            {p.label}
          </text>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-dim">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t border-dashed border-warn" /> aprobado (70)
        </li>
      </ul>
    </div>
  );
}
