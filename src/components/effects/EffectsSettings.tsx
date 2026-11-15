"use client";

import { readPrefs, useEffectsPrefs, writePrefs } from "./prefs";
import { playSound } from "./sound";

export function EffectsSettings() {
  const prefs = useEffectsPrefs();
  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--na-available)]"
          checked={prefs.motion}
          onChange={(e) => writePrefs({ ...readPrefs(), motion: e.target.checked })}
        />
        Animaciones (glitch al ganar XP, línea de escaneo, texto que se descifra, pantalla de arranque diaria)
      </label>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--na-available)]"
          checked={prefs.crt}
          onChange={(e) => writePrefs({ ...readPrefs(), crt: e.target.checked })}
        />
        Pantalla CRT (líneas horizontales sutiles y viñeta; apágala si te cansa la vista)
      </label>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--na-available)]"
          checked={prefs.sound}
          onChange={(e) => {
            writePrefs({ ...readPrefs(), sound: e.target.checked });
            if (e.target.checked) playSound("xp");
          }}
        />
        Sonidos (apagados por defecto)
      </label>
      <p className="text-xs text-dim">Se guardan en este navegador. Si tu sistema pide reducir el movimiento, las animaciones se desactivan.</p>
    </div>
  );
}
