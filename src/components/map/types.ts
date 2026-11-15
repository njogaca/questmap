import type { NodeState } from "@/lib/progress";

/**
 * Tipos compartidos por todas las vistas del mapa. Viven aparte para que cada vista
 * (hexágonos, nmap, consola retro) los importe sin depender de `WorldMap`, que a su vez
 * las importa a ellas: si los tipos vivieran ahí, el import sería circular.
 */
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

/** Lo que toda vista del mapa recibe: las zonas, cuál está apuntada y cómo apuntar otra. */
export type MapViewProps = {
  zones: MapZone[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export const pad2 = (n: number) => String(n).padStart(2, "0");
