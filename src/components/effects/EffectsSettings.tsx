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
        Animaciones (glitch al ganar XP, línea de escaneo, texto que se descifra)
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
