"use client";

import { readPrefs, THEMES, useEffectsPrefs, writePrefs } from "./prefs";
import { playSound } from "./sound";

export function EffectsSettings() {
  const prefs = useEffectsPrefs();
  return (
    <div className="space-y-3 text-sm">
      <fieldset>
        <legend className="hud-label mb-2">paleta</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = prefs.theme === t.id;
            return (
              <label key={t.id} className={`hud-item flex cursor-pointer items-start gap-3 p-3 ${active ? "border-available" : ""}`}>
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={active}
                  onChange={() => writePrefs({ ...readPrefs(), theme: t.id })}
                  className="mt-1 h-4 w-4 accent-[var(--na-available)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-title text-base tracking-wider">
                    {t.name}
                    <ThemeSwatch theme={t.id} />
                  </span>
                  <span className="mt-0.5 block text-xs text-dim">{t.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
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

const SWATCHES: Record<string, string[]> = {
  ctos: ["#3aa8f0", "#ffb020", "#d9f1ff", "#ff5a3c"],
  neon: ["#00e5ff", "#ff2e88", "#39ff88", "#ffd60a"],
  dedsec: ["#f2ff00", "#ff2d95", "#00f0ff", "#ff6a00"],
};

function ThemeSwatch({ theme }: { theme: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {SWATCHES[theme]?.map((c) => (
        <span key={c} className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: c }} />
      ))}
    </span>
  );
}
