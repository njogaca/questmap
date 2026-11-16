"use client";

import Link from "next/link";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import type { NodeState } from "@/lib/progress";
import { asciiBar } from "../ascii";
import { STATE_COLOR } from "../state";
import { pad2, type MapViewProps, type MapZone } from "./types";

/** Cómo se lee cada estado en la salida de nmap. */
const NMAP_STATE: Record<NodeState, string> = {
  available: "open",
  in_progress: "open",
  completed: "owned",
  locked: "filtered",
  outline: "closed",
};
const COLS = "grid grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_minmax(0,1.4fr)] gap-x-3";

/** Interfaz Terminal (Mr. Robot): el mapa como la salida de un escaneo `nmap`. */
export function MapNmap({ zones, selectedId, onSelect }: MapViewProps) {
  const sorted = [...zones].sort((a, b) => a.order - b.order);
  const count = (pred: (z: MapZone) => boolean) => zones.filter(pred).length;
  const open = count((z) => z.state === "available" || z.state === "in_progress");
  const owned = count((z) => z.state === "completed");
  const filtered = count((z) => z.state === "locked");

  return (
    <div className="map-view map-nmap overflow-x-auto border border-line bg-surface p-4 font-mono text-xs leading-relaxed">
      <p>
        <span className="text-done">friend@questmap</span>
        <span className="text-dim">:~$</span> nmap -sV atlas.questmap
      </p>
      <div className="mt-2 text-dim">
        <p>Starting Nmap 7.95 ( https://nmap.org )</p>
        <p>Nmap scan report for atlas.questmap (127.0.0.1)</p>
        <p>Host is up (0.00042s latency).</p>
      </div>
      <p className={`${COLS} mt-3 px-1 text-ink`}>
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
                : `${asciiBar(z.percent, 10)} ${String(z.percent).padStart(3)}% N${z.levelsCompleted}/${z.levelsTotal}`;
          return (
            <li key={z.id}>
              <Link
                href={`/zone/${z.slug}`}
                onMouseEnter={() => onSelect(z.id)}
                onFocus={() => onSelect(z.id)}
                aria-label={`${z.title}: ${NMAP_STATE[z.state]}`}
                className={`${COLS} px-1 outline-none ${sel ? "bg-available/10" : "hover:bg-available/5"}`}
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
