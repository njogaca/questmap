"use client";

import Link from "next/link";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import type { NodeState } from "@/lib/progress";
import { STATE_COLOR } from "../state";
import { pad2, type MapViewProps } from "./types";

/**
 * Cómo nombra el Animus cada estado. La metáfora: no estás "desbloqueando zonas", estás
 * reviviendo memorias de alguien, y lo que no puedes revivir todavía es que los datos están
 * corruptos — no que una puerta esté cerrada.
 */
const MEMORY_STATE: Record<NodeState, string> = {
  available: "lista para revivir",
  in_progress: "reviviendo",
  completed: "sincronizada",
  locked: "memoria corrupta",
  outline: "sin datos",
};

/**
 * Interfaz Códice Animus: el mapa como una secuencia de memorias, en vertical. A diferencia del
 * nmap y del POST, que son tablas, aquí lo que manda es el ORDEN: una línea que las enhebra.
 */
export function MapCodex({ zones, selectedId, onSelect }: MapViewProps) {
  const sorted = [...zones].sort((a, b) => a.order - b.order);
  const synced = zones.filter((z) => z.state === "completed").length;
  const global = Math.round(zones.reduce((a, z) => a + z.percent, 0) / Math.max(1, zones.length));

  return (
    <div className="map-view map-codex border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
          secuencia de memoria · atlas
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
          sincronización <span className="text-available">{global} %</span> · {synced}/{zones.length} memorias
        </p>
      </div>

      <ol className="relative mt-4 space-y-1 pl-8">
        {/* La hebra que une las memorias en secuencia */}
        <span className="absolute bottom-3 left-3 top-3 w-px bg-line" aria-hidden />
        {sorted.map((z) => {
          const color = STATE_COLOR[z.state];
          const sel = z.id === selectedId;
          const corrupt = z.state === "locked";
          const pending = z.prereqs.find((p) => !p.met);
          return (
            <li key={z.id} className="relative">
              {/* El nodo sobre la hebra */}
              <span
                className="absolute -left-[1.4rem] top-3.5 h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: color, background: z.state === "completed" ? color : "var(--na-surface)" }}
                aria-hidden
              />
              <Link
                href={`/zone/${z.slug}`}
                onMouseEnter={() => onSelect(z.id)}
                onFocus={() => onSelect(z.id)}
                aria-label={`${z.title}: ${MEMORY_STATE[z.state]}`}
                className={`block border-l-2 py-2 pl-3 pr-2 outline-none transition-colors ${
                  sel ? "border-available bg-available/5" : "border-transparent hover:bg-available/5"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="min-w-0 truncate">
                    <span className="font-mono text-xs text-dim">memoria {pad2(z.order)}</span>
                    <span className={`ml-2 ${corrupt ? "font-mono text-dim" : "font-semibold"}`}>
                      {corrupt ? encrypt(z.title, decryptRatio(z.prereqs)) : z.title}
                    </span>
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color }}>
                    {MEMORY_STATE[z.state]}
                  </p>
                </div>

                {corrupt ? (
                  <p className="mt-1 font-mono text-[11px] text-dim">
                    {Math.round(decryptRatio(z.prereqs) * 100)} % reconstruido
                    {pending && ` · requiere ${pending.zoneTitle} nivel ${pending.level}`}
                  </p>
                ) : (
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-line">
                      <span className="block h-px" style={{ width: `${z.percent}%`, background: color }} />
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-dim">
                      {z.percent} % · {z.levelsCompleted}/{z.levelsTotal}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
