"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { activateTrack } from "@/app/track-actions";
import { readPrefs, writePrefs, THEMES, type Theme, type Ui } from "@/components/effects/prefs";
import { btnPrimary } from "@/components/ui";

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

/**
 * Activa una ruta y aplica su aspecto: paleta e interfaz (hexágonos o terminal). Las dos son
 * valores por defecto, no imposiciones — se escriben en las preferencias del navegador igual
 * que si las eligieras en Ajustes, así que puedes cambiarlas después y tu elección manda.
 */
export function TrackSwitch({
  trackId,
  palette,
  ui,
  active,
}: {
  trackId: number;
  palette: string | null;
  ui: string | null;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (active) {
    return (
      <p className="inline-flex items-center gap-2 border border-done/50 bg-done/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-done">
        <span aria-hidden>●</span> cursando ahora
      </p>
    );
  }

  const onClick = () =>
    start(async () => {
      setError(null);
      const res = await activateTrack(trackId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Una sola escritura con las dos cosas: dos writePrefs seguidos dispararían dos
      // repintados y el segundo leería un estado a medias.
      const prefs = readPrefs();
      writePrefs({
        ...prefs,
        theme: palette && THEME_IDS.has(palette) ? (palette as Theme) : prefs.theme,
        ui: ui === "hud" || ui === "terminal" ? (ui as Ui) : prefs.ui,
      });
      router.refresh();
    });

  return (
    <div>
      <button type="button" onClick={onClick} disabled={pending} className={`${btnPrimary} w-full gap-2`}>
        {pending ? (
          "cambiando…"
        ) : (
          <>
            cambiar a esta ruta <span aria-hidden>→</span>
          </>
        )}
      </button>
      {error && <p className="mt-1 font-mono text-xs text-warn">{error}</p>}
    </div>
  );
}
