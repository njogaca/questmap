"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import type { NodeState } from "@/lib/progress";
import { DecryptText } from "./effects/DecryptText";
import { asciiBar } from "./ascii";
import { ProgressBar, StateBadge } from "./StateBadge";
import { STATE_COLOR } from "./state";
import { btnPrimary } from "./ui";

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
const pad2 = (n: number) => String(n).padStart(2, "0");

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

/** Panal de fondo (patrón SVG): hexágonos de lado `a` con la punta hacia arriba. */
const HEX_A = 18;
const HEX_W = Math.sqrt(3) * HEX_A;
const HEX_H = 3 * HEX_A;
function hexTile(cx: number, cy: number) {
  const a = HEX_A;
  const w = HEX_W / 2;
  return `M${cx},${cy - a} L${cx + w},${cy - a / 2} L${cx + w},${cy + a / 2} L${cx},${cy + a} L${cx - w},${cy + a / 2} L${cx - w},${cy - a / 2} Z`;
}
const HEX_PATTERN = [hexTile(HEX_W / 2, HEX_A), hexTile(0, 2.5 * HEX_A), hexTile(HEX_W, 2.5 * HEX_A)].join(" ");

/** Retícula de selección: cuatro esquinas en L alrededor del nodo. */
function reticlePath(cx: number, cy: number, half: number, arm: number) {
  const l = cx - half;
  const r = cx + half;
  const t = cy - half;
  const b = cy + half;
  return [
    `M${l},${t + arm} V${t} H${l + arm}`,
    `M${r - arm},${t} H${r} V${t + arm}`,
    `M${r},${b - arm} V${b} H${r - arm}`,
    `M${l + arm},${b} H${l} V${b - arm}`,
  ].join(" ");
}

export function WorldMap({ zones, edges }: { zones: MapZone[]; edges: MapEdge[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(
    () => zones.find((z) => z.state === "in_progress")?.id ?? zones.find((z) => z.state === "available")?.id ?? null,
  );
  const byId = new Map(zones.map((z) => [z.id, z]));
  const selected = selectedId != null ? byId.get(selectedId) : undefined;
  const compromised = zones.filter((z) => z.state === "completed").length;
  const active = zones.filter((z) => z.state === "in_progress").length;

  const onNodeClick = (z: MapZone) => {
    // En el celular: el primer toque selecciona, el segundo entra. En desktop el hover ya seleccionó.
    if (selectedId === z.id) router.push(`/zone/${z.slug}`);
    else setSelectedId(z.id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="ui-hud hud-crosshair relative overflow-hidden border border-line bg-surface/60">
        {/* Lecturas HUD sobre el mapa */}
        <div className="pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-between gap-4 font-mono text-[11px] uppercase tracking-widest text-dim">
          <p>
            <span className="qm-blink text-available">▮</span> sector scan · {zones.length} nodos · {compromised} comprometidos · {active} en curso
          </p>
          {selected ? (
            <p>
              <span className="text-available">target // {pad2(selected.order)}</span> · x{Math.round(selected.x)} y{Math.round(selected.y)}
            </p>
          ) : (
            <p>sin objetivo</p>
          )}
        </div>

        {/*
         * El viewBox es 1000x640, así que el SVG se escala a lo que mida su contenedor. Por eso
         * la página del mapa va acotada a max-w-6xl y NO a pantalla completa: con un viewBox fijo,
         * "más ancho" no significa más lienzo, significa hexágonos y etiquetas más grandes. A
         * pantalla completa el mapa llegó a 1540 px (1.54x) y se veía inflado; con 6xl queda en
         * ~800. El tope de aquí es solo una red de seguridad por si alguien ensancha la página.
         *
         * Si quieres MÁS lienzo de verdad (más separación entre zonas) hay que ampliar el viewBox
         * y recolocar las zonas, que es otro trabajo.
         */}
        <svg
          viewBox="0 0 1000 640"
          className="mx-auto block h-auto w-full max-w-[820px]"
          role="img"
          aria-label={`Mapa del mundo con ${zones.length} sectores`}
        >
          <defs>
            <pattern id="qm-hex" width={HEX_W} height={HEX_H} patternUnits="userSpaceOnUse">
              <path d={HEX_PATTERN} fill="none" stroke="var(--na-available)" strokeWidth={0.6} opacity={0.12} />
            </pattern>
            <radialGradient id="qm-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="60%" stopColor="var(--na-bg)" stopOpacity={0} />
              <stop offset="100%" stopColor="var(--na-bg)" stopOpacity={0.85} />
            </radialGradient>
          </defs>
          <rect width="1000" height="640" fill="url(#qm-hex)" />
          <rect width="1000" height="640" fill="url(#qm-vignette)" pointerEvents="none" />
          {/* Ejes de referencia */}
          <g stroke="var(--na-border)" strokeWidth={1} strokeDasharray="2 6" opacity={0.7}>
            <line x1={500} y1={0} x2={500} y2={640} />
            <line x1={0} y1={320} x2={1000} y2={320} />
          </g>

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
                  strokeWidth={e.met ? 1.5 : 2}
                  strokeDasharray={e.met ? undefined : "6 8"}
                  opacity={e.met ? 0.45 : 0.3}
                />
                {e.met && (
                  // Flujo de datos sobre los caminos abiertos
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeDasharray="6 22"
                    strokeLinecap="round"
                    opacity={0.9}
                    className="qm-flow"
                  />
                )}
                <rect x={mx - 17} y={my - 20} width={34} height={18} fill="var(--na-bg)" stroke={color} strokeWidth={1} opacity={e.met ? 0.9 : 0.5} />
                <text x={mx} y={my - 7} textAnchor="middle" fontSize={13} fill={color} opacity={e.met ? 1 : 0.7} className="font-mono">
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
                  <>
                    {/* Retícula de objetivo: anillo giratorio + esquinas */}
                    <polygon
                      points={hexPoints(z.x, z.y, R + 12)}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="16 10"
                      opacity={0.8}
                      className="qm-spin"
                    />
                    <circle cx={z.x} cy={z.y} r={R + 24} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 10" opacity={0.5} className="qm-spin-rev" />
                    <path d={reticlePath(z.x, z.y, R + 34, 12)} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
                  </>
                )}
                {z.state === "in_progress" && !isSel && (
                  <polygon points={hexPoints(z.x, z.y, R + 8)} fill="none" stroke={color} strokeWidth={1} opacity={0.5} className="qm-pulse" />
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
                {/* Marcas internas tipo radar */}
                <polygon points={hexPoints(z.x, z.y, R - 7)} fill="none" stroke={color} strokeWidth={0.75} opacity={dim ? 0.25 : 0.45} />
                <text x={z.x} y={z.y + 10} textAnchor="middle" fontSize={30} opacity={dim ? 0.45 : 1}>
                  {z.emoji}
                </text>
                <text
                  x={z.x}
                  y={z.y + R + 26}
                  textAnchor="middle"
                  fontSize={19}
                  fill={dim ? "var(--na-text-dim)" : "var(--na-text)"}
                  className="font-title"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {pad2(z.order)} ·{" "}
                  {z.state === "locked"
                    ? encrypt(z.title.split(" ")[0].toUpperCase(), decryptRatio(z.prereqs))
                    : z.title.split(" ")[0].toUpperCase()}
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
        <div className="qm-scanline" aria-hidden />
        <Legend />
      </div>

      {/* Interfaz Terminal: el mismo mapa como la salida de un escaneo nmap */}
      <NmapView zones={zones} selectedId={selectedId} onSelect={setSelectedId} />

      {/* Panel de info del sector seleccionado */}
      <aside className="hud-panel hud-corners p-4" aria-live="polite">
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
      <p className="hud-label">target // sector {pad2(zone.order)}</p>
      <h2 className="mt-1 text-2xl font-semibold">
        <span className="mr-2">{zone.emoji}</span>
        {zone.state === "locked" ? (
          <span className="font-mono text-dim">{encrypt(zone.title, decryptRatio(zone.prereqs))}</span>
        ) : (
          <DecryptText key={zone.id} text={zone.title} durationMs={500} />
        )}
      </h2>
      {zone.state === "locked" && (
        <p className="mt-1 font-mono text-xs text-dim">
          ▓ datos cifrados · {Math.round(decryptRatio(zone.prereqs) * 100)} % descifrado
        </p>
      )}
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
            <li key={s.code} className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px]">
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
      <Link href={`/zone/${zone.slug}`} className={`${btnPrimary} mt-5`}>
        &gt; entrar al sector
      </Link>
    </div>
  );
}

/** Cómo se lee cada estado en la salida de nmap. */
const NMAP_STATE: Record<NodeState, string> = {
  available: "open",
  in_progress: "open",
  completed: "owned",
  locked: "filtered",
  outline: "closed",
};
const NMAP_COLS = "grid grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_minmax(0,1.4fr)] gap-x-3";

function NmapView({
  zones,
  selectedId,
  onSelect,
}: {
  zones: MapZone[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.order - b.order);
  const count = (pred: (z: MapZone) => boolean) => zones.filter(pred).length;
  const open = count((z) => z.state === "available" || z.state === "in_progress");
  const owned = count((z) => z.state === "completed");
  const filtered = count((z) => z.state === "locked");

  return (
    <div className="ui-term overflow-x-auto border border-line bg-surface p-4 font-mono text-xs leading-relaxed">
      <p>
        <span className="text-done">friend@questmap</span>
        <span className="text-dim">:~$</span> nmap -sV atlas.questmap
      </p>
      <div className="mt-2 text-dim">
        <p>Starting Nmap 7.95 ( https://nmap.org )</p>
        <p>Nmap scan report for atlas.questmap (127.0.0.1)</p>
        <p>Host is up (0.00042s latency).</p>
      </div>
      <p className={`${NMAP_COLS} mt-3 px-1 text-ink`}>
        <span>SECTOR</span>
        <span>STATE</span>
        <span>SERVICE</span>
        <span>PROGRESS</span>
      </p>
      <ul>
        {sorted.map((z) => {
          const color = STATE_COLOR[z.state];
          const sel = z.id === selectedId;
          const pending = z.prereqs.find((p) => !p.met);
          const detail =
            z.state === "locked"
              ? `req: ${pending ? `${pending.zoneTitle} N${pending.level}` : "—"}`
              : z.state === "outline"
                ? "próximamente"
                : `${asciiBar(z.percent, 10)} ${String(z.percent).padStart(3)}% N${z.levelsCompleted}/5`;
          return (
            <li key={z.id}>
              <Link
                href={`/zone/${z.slug}`}
                onMouseEnter={() => onSelect(z.id)}
                onFocus={() => onSelect(z.id)}
                aria-label={`${z.title}: ${NMAP_STATE[z.state]}`}
                className={`${NMAP_COLS} px-1 outline-none ${sel ? "bg-available/10" : "hover:bg-available/5"}`}
              >
                <span className={sel ? "text-available" : "text-dim"}>
                  {sel ? "›" : " "}
                  {pad2(z.order)}/tcp
                </span>
                <span style={{ color }}>{NMAP_STATE[z.state]}</span>
                <span className={`truncate ${z.state === "locked" ? "text-dim" : "text-ink"}`}>
                  {z.state === "locked" ? encrypt(z.slug, decryptRatio(z.prereqs)) : z.slug}
                </span>
                <span className="truncate whitespace-pre" style={{ color: z.state === "locked" ? undefined : color }}>
                  {detail}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-dim">
        Nmap done: {zones.length} sectores escaneados · {open} open · {owned} owned · {filtered} filtered
      </p>
      <p className="mt-1 text-dim">
        <span className="text-done">friend@questmap</span>:~$ <span className="qm-blink text-available">▮</span>
      </p>
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
    <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-dim">
      {items.map(([s, label]) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rotate-45" style={{ background: STATE_COLOR[s] }} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rotate-45 border border-dashed border-locked" />
        próximamente
      </li>
    </ul>
  );
}
