"use client";

import { useEffect, useState } from "react";

/**
 * Preferencias de efectos por navegador (localStorage). Sonido: apagado por defecto; CRT: encendido.
 *
 * LA PALETA YA NO SE ELIGE APARTE. Cada interfaz trae la suya y es parte de su identidad: elegir
 * "Consola Retro" es elegir el ámbar, igual que elegir "Terminal" es elegir el gris con un rojo.
 * El `data-theme` del html sigue existiendo —de ahí salen todos los colores— pero se deriva de `ui`.
 *
 * Para añadir una interfaz hay que tocar también globals.css, el BOOT_SCRIPT de
 * src/app/layout.tsx y el z.enum de `ui` en src/content/schema.ts. Ver AGENTS.md.
 */
export type Theme = "ctos" | "neon" | "dedsec" | "fsociety" | "frostpunk" | "cyberpunk" | "animus";
export type Ui = "hud" | "terminal" | "retro" | "animus";

/**
 * La paleta de cada interfaz. `neon`, `dedsec` y `cyberpunk` siguen definidas en globals.css pero
 * ninguna interfaz las usa todavía: quedan listas para la próxima que quiera adoptarlas.
 */
export const UI_THEME: Record<Ui, Theme> = {
  hud: "ctos",
  terminal: "fsociety",
  retro: "frostpunk",
  animus: "animus",
};

export const UIS: { id: Ui; name: string; desc: string; swatch: string[] }[] = [
  {
    id: "hud",
    name: "HUD · Watch Dogs",
    desc: "Paneles angulares, mapa holográfico de hexágonos y animaciones. Azul acero y ámbar.",
    swatch: ["#3aa8f0", "#ffb020", "#d9f1ff", "#ff5a3c"],
  },
  {
    id: "terminal",
    name: "Terminal · Mr. Robot",
    desc: "Todo es una shell: fuente mono, el mapa como escaneo nmap, barras ASCII y barra de comandos fija. Gris y blanco con un solo rojo.",
    swatch: ["#f2f2f2", "#e8282e", "#73c278", "#d9a21b"],
  },
  {
    id: "retro",
    name: "Consola Retro · BIOS",
    desc: "Una máquina de los 80: mayúsculas, cajas de 2 px y el mapa como un POST que detecta sectores. Ámbar sobre acero helado.",
    swatch: ["#ff8a3d", "#8fd3ff", "#ffd166", "#ff4d3d"],
  },
  {
    id: "animus",
    name: "Códice Animus · Assassin's Creed",
    desc: "La sala blanca: la única interfaz clara. El mapa como memorias por sincronizar, y lo bloqueado marcado como memoria corrupta.",
    swatch: ["#0a7fbf", "#b8860b", "#0e7a5f", "#c1272d"],
  },
];

const UI_IDS = new Set<string>(UIS.map((u) => u.id));
const isUi = (v: unknown): v is Ui => typeof v === "string" && UI_IDS.has(v);

export type EffectsPrefs = { sound: boolean; motion: boolean; crt: boolean; theme: Theme; ui: Ui };

const KEY = "qm.effects";
const EVENT = "qm-effects-change";
const DEFAULTS: EffectsPrefs = { sound: false, motion: true, crt: true, theme: UI_THEME.hud, ui: "hud" };

function systemReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function readPrefs(): EffectsPrefs {
  const fallback: EffectsPrefs = { ...DEFAULTS, motion: typeof window === "undefined" ? true : !systemReducedMotion() };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<EffectsPrefs>;
    const ui = isUi(p.ui) ? p.ui : "hud";
    return {
      sound: p.sound === true,
      motion: p.motion ?? fallback.motion,
      crt: p.crt ?? true,
      // La paleta se deriva de la interfaz: si había una guardada de antes, se ignora.
      theme: UI_THEME[ui],
      ui,
    };
  } catch {
    return fallback;
  }
}

export function writePrefs(p: EffectsPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...p, theme: UI_THEME[p.ui] }));
  } catch {
    // modo privado o almacenamiento bloqueado: se usa el valor por defecto
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useEffectsPrefs(): EffectsPrefs {
  const [prefs, setPrefs] = useState<EffectsPrefs>(DEFAULTS);
  useEffect(() => {
    const update = () => setPrefs(readPrefs());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return prefs;
}
