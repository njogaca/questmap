/** Radar SVG de readiness por skill (0–100). Sin librerías. */
export function RadarChart({
  items,
  threshold = 60,
}: {
  items: { code: string; label: string; value: number; core: boolean }[];
  threshold?: number;
}) {
  const size = 360;
  const c = size / 2;
  const r = 120;
  const n = items.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => {
    const a = angle(i);
    const rr = (r * v) / 100;
    return [c + rr * Math.cos(a), c + rr * Math.sin(a)] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox={`-70 -6 ${size + 140} ${size + 12}`} className="mx-auto block h-auto w-full max-w-md" role="img" aria-label="Radar de readiness por skill">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={poly(items.map(() => g))} fill="none" stroke="var(--na-border)" strokeWidth={1} />
      ))}
      <polygon
        points={poly(items.map(() => threshold))}
        fill="none"
        stroke="var(--na-warn)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      {items.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--na-border)" strokeWidth={1} />;
      })}
      <polygon
        points={poly(items.map((it) => Math.max(it.value, 1.5)))}
        fill="var(--na-available)"
        fillOpacity={0.18}
        stroke="var(--na-available)"
        strokeWidth={2}
      />
      {items.map((it, i) => {
        const [x, y] = pt(i, 118);
        const anchor = Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end";
        return (
          <text
            key={it.code}
            x={x}
            y={y + 4}
            textAnchor={anchor}
            fontSize={11}
            fill={it.core ? "var(--na-text)" : "var(--na-text-dim)"}
            className="font-mono"
          >
            {it.label}
          </text>
        );
      })}
    </svg>
  );
}
