"use client";

import Link from "next/link";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import type { NodeState } from "@/lib/progress";
import { STATE_COLOR } from "../state";
import { pad2, type MapViewProps } from "./types";

/**
 * Cómo sella el archivo cada estado. La metáfora: cada zona es un expediente de un caso, y tu
 * progreso es cuánto has podido leer de él. Lo bloqueado no está "cerrado": está CLASIFICADO.
 */
const STAMP: Record<NodeState, string> = {
  available: "sin abrir",
  in_progress: "en curso",
  completed: "cerrado",
  locked: "clasificado",
  outline: "sin expediente",
};

/**
 * Interfaz Expediente: el mapa como las carpetas de un archivo. Es la vista menos "pantalla" de
 * todas — no hay escaneo, ni POST, ni retícula: hay papel, pestañas y sellos. A diferencia del
 * códice, que va en secuencia, aquí lo natural es la rejilla: un cajón de carpetas.
 */
export function MapDossier({ zones, selectedId, onSelect }: MapViewProps) {
  const sorted = [...zones].sort((a, b) => a.order - b.order);
  const closed = zones.filter((z) => z.state === "completed").length;
  const classified = zones.filter((z) => z.state === "locked").length;

  return (
    <div className="map-view map-dossier border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-line pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
          archivo · atlas · {zones.length} expedientes
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
          {closed} cerrados · {classified} clasificados
        </p>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorted.map((z) => {
          const color = STATE_COLOR[z.state];
          const sel = z.id === selectedId;
          const secret = z.state === "locked";
          const pending = z.prereqs.find((p) => !p.met);
          return (
            <li key={z.id}>
              <Link
                href={`/zone/${z.slug}`}
                onMouseEnter={() => onSelect(z.id)}
                onFocus={() => onSelect(z.id)}
                aria-label={`${z.title}: ${STAMP[z.state]}`}
                className={`relative block border border-line bg-surface-2 outline-none transition-transform ${
                  sel ? "-translate-y-0.5 border-available" : "hover:-translate-y-0.5"
                }`}
              >
                {/* La pestaña de la carpeta */}
                <span
                  className="absolute -top-px left-4 h-1 w-12 border-x border-t border-line"
                  style={{ background: color }}
                  aria-hidden
                />

                <div className="flex items-start justify-between gap-3 p-3 pt-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-dim">
                      exp. {pad2(z.order)}
                    </p>
                    <p className={`mt-0.5 truncate ${secret ? "font-mono text-dim" : "font-semibold"}`}>
                      {secret ? encrypt(z.title, decryptRatio(z.prereqs)) : z.title}
                    </p>
                  </div>
                  {/* El sello, ladeado como si lo hubieran estampado a mano */}
                  <span
                    className="shrink-0 -rotate-6 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                    style={{ color, borderColor: color }}
                  >
                    {STAMP[z.state]}
                  </span>
                </div>

                <div className="border-t border-dashed border-line px-3 py-2 font-mono text-[11px] text-dim">
                  {secret ? (
                    <>
                      {Math.round(decryptRatio(z.prereqs) * 100)} % desclasificado
                      {pending && ` · falta ${pending.zoneTitle} N${pending.level}`}
                    </>
                  ) : (
                    <>
                      {z.levelsCompleted}/5 carpetas leídas · {z.percent} %
                    </>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
