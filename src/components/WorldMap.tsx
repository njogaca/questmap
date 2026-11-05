"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NodeState } from "@/lib/progress";
import { ProgressBar, StateBadge } from "./StateBadge";
import { STATE_COLOR } from "./state";

export type MapZone = {
  id: number;
  slug: string;
  title: string;
  order: number;
  emoji: string | null;
  x: number;
  y: number;
  state: NodeState;
  percent: number;
  levelsCompleted: number;
  skills: { code: string; name: string }[];
  prereqs: { zoneTitle: string; level: number; met: boolean }[];
};
export type MapEdge = { from: number; to: number; level: number; met: boolean };

const R = 46;

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

export function WorldMap({ zones, edges }: { zones: MapZone[]; edges: MapEdge[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(
    () => zones.find((z) => z.state === "in_progress")?.id ?? zones.find((z) => z.state === "available")?.id ?? null,
  );
  const byId = new Map(zones.map((z) => [z.id, z]));
  const selected = selectedId != null ? byId.get(selectedId) : undefined;

  const onNodeClick = (z: MapZone) => {
    // En el celular: el primer toque selecciona, el segundo entra. En desktop el hover ya seleccionó.
    if (selectedId === z.id) router.push(`/zone/${z.slug}`);
    else setSelectedId(z.id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface/60">
        <svg viewBox="0 0 1000 640" className="block h-auto w-full" role="img" aria-label="Mapa del mundo con 10 sectores">
          {/* Caminos (prerrequisitos) */}
          {edges.map((e) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const color = e.met ? "var(--na-available)" : "var(--na-locked)";
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <g key={`${e.from}-${e.to}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={e.met ? undefined : "6 8"}
                  opacity={e.met ? 0.8 : 0.3}
                />
                <text x={mx} y={my - 6} textAnchor="middle" fontSize={16} fill={color} opacity={e.met ? 1 : 0.6} className="font-mono">
                  N{e.level}
                </text>
              </g>
            );
          })}

          {/* Nodos (zonas) */}
          {zones.map((z) => {
            const color = STATE_COLOR[z.state];
            const isSel = z.id === selectedId;
            const dim = z.state === "locked" || z.state === "outline";
            return (
              <g
                key={z.id}
                role="button"
                tabIndex={0}
                aria-label={`${z.title}: ${z.state}`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setSelectedId(z.id)}
                onFocus={() => setSelectedId(z.id)}
                onClick={() => onNodeClick(z)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") router.push(`/zone/${z.slug}`);
                }}
              >
                {isSel && (
                  <polygon points={hexPoints(z.x, z.y, R + 10)} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
                )}
                <polygon
                  points={hexPoints(z.x, z.y, R)}
                  fill={z.state === "completed" ? color : "var(--na-surface)"}
                  fillOpacity={z.state === "completed" ? 0.18 : 1}
                  stroke={color}
                  strokeWidth={isSel ? 3 : 2}
                  strokeDasharray={z.state === "outline" ? "5 5" : undefined}
                  className="transition-all duration-200"
                />
                <text x={z.x} y={z.y + 10} textAnchor="middle" fontSize={30} opacity={dim ? 0.45 : 1}>
                  {z.emoji}
                </text>
                <text
                  x={z.x}
                  y={z.y + R + 26}
                  textAnchor="middle"
                  fontSize={20}
                  fill={dim ? "var(--na-text-dim)" : "var(--na-text)"}
                  className="font-title"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {String(z.order).padStart(2, "0")} · {z.title.split(" ")[0].toUpperCase()}
                </text>
                {z.state === "outline" && (
                  <text x={z.x} y={z.y - R - 10} textAnchor="middle" fontSize={14} fill="var(--na-text-dim)" className="font-mono">
                    próximamente
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <Legend />
      </div>

      {/* Panel de info del sector seleccionado */}
      <aside className="rounded-lg border border-line bg-surface p-4" aria-live="polite">
        {selected ? (
          <ZonePanel zone={selected} />
        ) : (
          <p className="text-sm text-dim">Pasa el mouse o toca un sector para ver su progreso.</p>
        )}
      </aside>
    </div>
  );
}

function ZonePanel({ zone }: { zone: MapZone }) {
  return (
    <div>
      <p className="font-mono text-xs text-dim">sector {String(zone.order).padStart(2, "0")}</p>
      <h2 className="mt-1 text-2xl font-semibold">
        <span className="mr-2">{zone.emoji}</span>
        {zone.title}
      </h2>
      <div className="mt-2">
        <StateBadge state={zone.state} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between font-mono text-xs text-dim">
          <span>progreso</span>
          <span>
            {zone.percent} % · {zone.levelsCompleted}/5 niveles
          </span>
        </div>
        <ProgressBar percent={zone.percent} state={zone.state} />
      </div>
      <div className="mt-4">
        <p className="font-mono text-xs text-dim">skills</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {zone.skills.map((s) => (
            <li key={s.code} className="rounded bg-surface-2 px-2 py-0.5 text-xs">
              {s.name}
            </li>
          ))}
        </ul>
      </div>
      {zone.prereqs.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-xs text-dim">requiere</p>
          <ul className="mt-1 space-y-1 text-sm">
            {zone.prereqs.map((p) => (
              <li key={p.zoneTitle} className={p.met ? "text-done" : "text-dim"}>
                {p.met ? "✓" : "○"} {p.zoneTitle} — nivel {p.level}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        href={`/zone/${zone.slug}`}
        className="mt-5 inline-block rounded border border-available px-4 py-2 font-mono text-sm text-available transition-colors hover:bg-available hover:text-bg"
      >
        &gt; entrar al sector
      </Link>
    </div>
  );
}

function Legend() {
  const items: [NodeState, string][] = [
    ["available", "disponible"],
    ["in_progress", "en progreso"],
    ["completed", "completado"],
    ["locked", "bloqueado"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 font-mono text-xs text-dim">
      {items.map(([s, label]) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATE_COLOR[s] }} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full border border-dashed border-locked" />
        próximamente
      </li>
    </ul>
  );
}
