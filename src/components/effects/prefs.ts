"use client";

import { useEffect, useState } from "react";

/** Preferencias de efectos por navegador (localStorage). Sonido: apagado por defecto; CRT: encendido. */
export type Theme = "ctos" | "neon" | "dedsec";
export const THEMES: { id: Theme; name: string; desc: string }[] = [
  { id: "ctos", name: "ctOS", desc: "Watch Dogs 1: azul acero y blanco, ámbar para lo activo" },
  { id: "neon", name: "Neon Atlas", desc: "El original: cian y magenta sobre negro" },
  { id: "dedsec", name: "DedSec", desc: "Watch Dogs 2: amarillo ácido, rosa y cian" },
];
export type EffectsPrefs = { sound: boolean; motion: boolean; crt: boolean; theme: Theme };

function isTheme(v: unknown): v is Theme {
  return v === "ctos" || v === "neon" || v === "dedsec";
}

const KEY = "qm.effects";
const EVENT = "qm-effects-change";

function systemReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function readPrefs(): EffectsPrefs {
  const fallback: EffectsPrefs = {
    sound: false,
    motion: typeof window === "undefined" ? true : !systemReducedMotion(),
    crt: true,
    theme: "ctos",
  };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<EffectsPrefs>;
    return { sound: p.sound === true, motion: p.motion ?? fallback.motion, crt: p.crt ?? true, theme: isTheme(p.theme) ? p.theme : "ctos" };
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
  const [prefs, setPrefs] = useState<EffectsPrefs>({ sound: false, motion: true, crt: true, theme: "ctos" });
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
