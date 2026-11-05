"use client";

import { readPrefs } from "./prefs";

/** Sonidos sintetizados con WebAudio (sin archivos). Solo suenan si el usuario los activó. */
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, duration: number, type: OscillatorType = "square", gain = 0.04) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

export function playSound(kind: "xp" | "levelup" | "badge") {
  if (!readPrefs().sound) return;
  try {
    ctx ??= new AudioContext();
    if (kind === "xp") {
      tone(880, 0, 0.08);
      tone(1320, 0.07, 0.12);
    } else if (kind === "badge") {
      tone(660, 0, 0.1, "triangle", 0.06);
      tone(990, 0.1, 0.18, "triangle", 0.06);
    } else {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16, "square", 0.05));
    }
  } catch {
    // navegador sin WebAudio: silencio
  }
}
