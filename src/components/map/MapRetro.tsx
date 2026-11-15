"use client";

import Link from "next/link";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import type { NodeState } from "@/lib/progress";
import { asciiBar } from "../ascii";
import { STATE_COLOR } from "../state";
import { pad2, type MapViewProps, type MapZone } from "./types";

/**
 * Cómo reporta el POST cada estado. La metáfora: cada zona es un dispositivo que la BIOS
 * detecta al arrancar, y tu progreso es si ese dispositivo respondió.
 */
const POST_STATE: Record<NodeState, string> = {
  available: "READY",
  in_progress: "ACTIVE",
  completed: "PASSED",
  locked: "LOCKED",
  outline: "NOT INSTALLED",
};

const COLS = "grid grid-cols-[3rem_minmax(0,1fr)_7.5rem_minmax(0,11rem)] gap-x-3";
/** Caracteres de dibujo de caja: lo que hacía de "interfaz gráfica" antes de las GUI. */
const RULE = "═".repeat(2);

export function MapRetro({ zones, selectedId, onSelect }: MapViewProps) {
  const sorted = [...zones].sort((a, b) => a.order - b.order);
  const count = (pred: (z: MapZone) => boolean) => zones.filter(pred).length;
  const passed = count((z) => z.state === "completed");
  const ready = count((z) => z.state === "available" || z.state === "in_progress");
  const locked = count((z) => z.state === "locked");
  const totalXp = zones.reduce((a, z) => a + z.percent, 0);

  return (
    <div className="map-view map-retro overflow-x-auto border-2 border-line bg-surface p-4 font-mono text-xs leading-relaxed">
      <div className="text-ink">
        <p className="font-semibold tracking-wider">QUESTMAP BIOS v2.6 — ATLAS SUBSYSTEM</p>
        <p className="text-dim">Copyright (C) QuestMap Corp. Todos los derechos reservados.</p>
      </div>

      <div className="mt-3 text-dim">
        <p>
          <span className="inline-block w-44 text-ink">Main Processor</span>: OPERADOR
        </p>
        <p>
          <span className="inline-block w-44 text-ink">Sector Memory Test</span>: {totalXp} KB OK
        </p>
        <p>
          <span className="inline-block w-44 text-ink">Detecting Sectors</span>: {zones.length} encontrados
        </p>
      </div>

      <p className="mt-3 whitespace-pre text-dim" aria-hidden>
        {`╔${RULE.repeat(28)}╗`}
      </p>
      <p className={`${COLS} px-1 font-semibold tracking-wider text-ink`}>
        <span>ID</span>
        <span>DEVICE</span>
        <span>STATUS</span>
        <span>COMPLETION</span>
      </p>
      <p className="whitespace-pre text-dim" aria-hidden>
        {`╠${RULE.repeat(28)}╣`}
      </p>

      <ul>
        {sorted.map((z) => {
          const color = STATE_COLOR[z.state];
          const sel = z.id === selectedId;
          const pending = z.prereqs.find((p) => !p.met);
          const detail =
            z.state === "locked"
              ? `REQ ${pending ? `${pending.zoneTitle.toUpperCase()} N${pending.level}` : "—"}`
              : z.state === "outline"
                ? "—"
                : `${asciiBar(z.percent, 8)} ${String(z.percent).padStart(3)}%`;
          return (
            <li key={z.id}>
              <Link
                href={`/zone/${z.slug}`}
                onMouseEnter={() => onSelect(z.id)}
                onFocus={() => onSelect(z.id)}
                aria-label={`${z.title}: ${POST_STATE[z.state]}`}
                className={`${COLS} px-1 uppercase outline-none ${sel ? "bg-available text-bg" : "hover:bg-available/10"}`}
              >
                <span className={sel ? "" : "text-dim"}>
                  {sel ? "▶" : " "}
                  {pad2(z.order)}
                </span>
                <span className={`truncate ${sel ? "" : z.state === "locked" ? "text-dim" : "text-ink"}`}>
                  {z.state === "locked" ? encrypt(z.title, decryptRatio(z.prereqs)) : z.title}
                </span>
                <span style={sel ? undefined : { color }}>{POST_STATE[z.state]}</span>
                <span className="truncate whitespace-pre" style={sel ? undefined : { color }}>
                  {detail}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="whitespace-pre text-dim" aria-hidden>
        {`╚${RULE.repeat(28)}╝`}
      </p>

      <div className="mt-3 text-dim">
        <p>
          POST completo — {passed} PASSED · {ready} READY · {locked} LOCKED
        </p>
        <p className="mt-1 text-ink">
          Pulsa <span className="text-available">ENTER</span> para arrancar el sector apuntado ·{" "}
          <span className="text-available">CTRL+K</span> para la consola
          <span className="qm-blink text-available"> ▮</span>
        </p>
      </div>
    </div>
  );
}
