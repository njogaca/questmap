"use client";

import { useEffect, useState } from "react";

/**
 * Preferencias de efectos por navegador (localStorage). Sonido: apagado por defecto; CRT: encendido.
 * Interfaz y paleta son independientes: cualquier paleta funciona con cualquier interfaz.
 * Si agregas una paleta, agrégala también al script inline de src/app/layout.tsx y a globals.css.
 */
export type Theme = "ctos" | "neon" | "dedsec" | "fsociety" | "frostpunk";
export type Ui = "hud" | "terminal";

export const THEMES: { id: Theme; name: string; desc: string; swatch: string[] }[] = [
  { id: "ctos", name: "ctOS", desc: "Watch Dogs 1: azul acero y blanco, ámbar para lo activo", swatch: ["#3aa8f0", "#ffb020", "#d9f1ff", "#ff5a3c"] },
  { id: "neon", name: "Neon Atlas", desc: "El original: cian y magenta sobre negro", swatch: ["#00e5ff", "#ff2e88", "#39ff88", "#ffd60a"] },
  { id: "dedsec", name: "DedSec", desc: "Watch Dogs 2: amarillo ácido, rosa y cian", swatch: ["#f2ff00", "#ff2d95", "#00f0ff", "#ff6a00"] },
  { id: "fsociety", name: "fsociety", desc: "Mr. Robot: terminal gris y blanca con un solo rojo", swatch: ["#f2f2f2", "#e8282e", "#73c278", "#d9a21b"] },
  { id: "frostpunk", name: "Frostpunk", desc: "El Generador: brasas naranjas contra acero helado", swatch: ["#ff8a3d", "#8fd3ff", "#ffd166", "#ff4d3d"] },
];

export const UIS: { id: Ui; name: string; desc: string }[] = [
  { id: "hud", name: "HUD · Watch Dogs", desc: "Paneles angulares, mapa holográfico de hexágonos y animaciones." },
  {
    id: "terminal",
    name: "Terminal · Mr. Robot",
    desc: "Todo es una shell: fuente mono, mapa como escaneo nmap, barras ASCII y barra de comandos fija. Aplica la paleta fsociety.",
  },
];

export type EffectsPrefs = { sound: boolean; motion: boolean; crt: boolean; theme: Theme; ui: Ui };

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const isTheme = (v: unknown): v is Theme => typeof v === "string" && THEME_IDS.has(v);

const KEY = "qm.effects";
const EVENT = "qm-effects-change";
const DEFAULTS: EffectsPrefs = { sound: false, motion: true, crt: true, theme: "ctos", ui: "hud" };

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
    return {
      sound: p.sound === true,
      motion: p.motion ?? fallback.motion,
      crt: p.crt ?? true,
      theme: isTheme(p.theme) ? p.theme : "ctos",
      ui: p.ui === "terminal" ? "terminal" : "hud",
    };
  } catch {
    return fallback;
  }
}

export function writePrefs(p: EffectsPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
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
