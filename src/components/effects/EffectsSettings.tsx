"use client";

import { readPrefs, THEMES, UIS, useEffectsPrefs, writePrefs, type Ui } from "./prefs";
import { playSound } from "./sound";

const card = "hud-item flex cursor-pointer items-start gap-3 p-3";
const radio = "mt-1 h-4 w-4 shrink-0 accent-[var(--na-available)]";

export function EffectsSettings() {
  const prefs = useEffectsPrefs();

  // Cada interfaz trae su paleta "natural"; después la puedes cambiar libremente.
  const setUi = (ui: Ui) => {
    const cur = readPrefs();
    const theme = ui === "terminal" ? "fsociety" : cur.theme === "fsociety" ? "ctos" : cur.theme;
    writePrefs({ ...cur, ui, theme });
  };

  return (
    <div className="space-y-4 text-sm">
      <fieldset>
        <legend className="hud-label mb-2 w-full">interfaz</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {UIS.map((u) => {
            const active = prefs.ui === u.id;
            return (
              <label key={u.id} className={`${card} ${active ? "border-available" : ""}`}>
                <input type="radio" name="ui" value={u.id} checked={active} onChange={() => setUi(u.id)} className={radio} />
                <span className="min-w-0">
                  <span className="block font-title text-base tracking-wider">{u.name}</span>
                  <span className="mt-0.5 block text-xs text-dim">{u.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="hud-label mb-2 w-full">paleta</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = prefs.theme === t.id;
            return (
              <label key={t.id} className={`${card} ${active ? "border-available" : ""}`}>
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={active}
                  onChange={() => writePrefs({ ...readPrefs(), theme: t.id })}
                  className={radio}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-title text-base tracking-wider">
                    {t.name}
                    <span className="inline-flex gap-0.5" aria-hidden>
                      {t.swatch.map((c) => (
                        <span key={c} className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: c }} />
                      ))}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-dim">{t.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-3">
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
      </div>
      <p className="text-xs text-dim">Se guardan en este navegador. Si tu sistema pide reducir el movimiento, las animaciones se desactivan.</p>
    </div>
  );
}
