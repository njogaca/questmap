"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { activateTrack } from "@/app/track-actions";
import { readPrefs, writePrefs, UIS, type Ui } from "@/components/effects/prefs";
import { btnPrimary } from "@/components/ui";

const UI_IDS = new Set<string>(UIS.map((u) => u.id));

/**
 * Activa una ruta y aplica su interfaz, que a su vez trae su paleta. Es un valor por defecto, no
 * una imposición: se escribe en las preferencias del navegador igual que si la eligieras en
 * Ajustes, así que puedes cambiarla después y tu elección manda.
 */
export function TrackSwitch({
  trackId,
  ui,
  active,
}: {
  trackId: number;
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
      const prefs = readPrefs();
      if (ui && UI_IDS.has(ui)) writePrefs({ ...prefs, ui: ui as Ui });
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
