"use client";

import { useEffect, useState } from "react";

/** Preferencias de efectos por navegador (localStorage). Sonido: apagado por defecto. */
export type EffectsPrefs = { sound: boolean; motion: boolean };

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
  const fallback = { sound: false, motion: typeof window === "undefined" ? true : !systemReducedMotion() };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<EffectsPrefs>;
    return { sound: p.sound === true, motion: p.motion ?? fallback.motion };
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
  const [prefs, setPrefs] = useState<EffectsPrefs>({ sound: false, motion: true });
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
