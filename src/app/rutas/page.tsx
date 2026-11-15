import type { Metadata } from "next";
import { TrackSwitch } from "@/components/tracks/TrackSwitch";
import { getActiveTrackId, loadTracksOverview } from "@/lib/track";
import { rankFor } from "@/lib/xp";

// El layout ya aplica la plantilla "%s · QuestMap": aquí solo va el nombre de la sección.
export const metadata: Metadata = { title: "Rutas" };
export const dynamic = "force-dynamic";

export default async function RutasPage() {
  const [tracks, activeId] = await Promise.all([loadTracksOverview(), getActiveTrackId()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="font-mono text-xs text-available">&gt; questmap://rutas</p>
      <h1 className="mt-1 text-3xl font-bold">Rutas de estudio</h1>
      <p className="mt-1 max-w-2xl text-sm text-dim">
        Cada ruta es un mundo propio, con sus zonas, sus skills y su XP. Cambiar de ruta no borra nada: el progreso de
        cada una se queda donde lo dejaste. Tu racha es una sola y no se parte, porque estudiaste ese día y da igual de
        qué.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const active = t.id === activeId;
          const pct = t.questsPublished > 0 ? Math.round((t.questsCompleted / t.questsPublished) * 100) : 0;
          return (
            <section key={t.id} className={`hud-panel p-4 ${active ? "hud-panel-done" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="hud-label">{active ? "ruta activa" : "ruta"}</p>
                  <h2 className="mt-1 font-title text-2xl">
                    {t.emoji} {t.title}
                  </h2>
                </div>
                <p className="shrink-0 text-right font-mono text-xs text-dim">
                  {t.xp.toLocaleString("es")} XP
                  <br />
                  <span className="text-available">{rankFor(t.xp).name}</span>
                </p>
              </div>

              {t.description && <p className="mt-2 text-sm text-dim">{t.description}</p>}

              <div className="mt-3">
                <div className="hud-bar h-2 w-full overflow-hidden">
                  <div className="h-full bg-available" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 font-mono text-xs text-dim">
                  {t.questsCompleted} / {t.questsPublished} quests publicadas · {pct} %
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="hud-item p-2">
                  <dt className="text-dim">zonas</dt>
                  <dd className="text-base">{t.zonesPublished}</dd>
                </div>
                <div className="hud-item p-2">
                  <dt className="text-dim">por escribir</dt>
                  <dd className="text-base">{t.zonesOutline}</dd>
                </div>
                <div className="hud-item p-2">
                  <dt className="text-dim">transversales</dt>
                  <dd className="text-base">{t.sharedZones}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <TrackSwitch trackId={t.id} ui={t.ui} active={active} />
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 max-w-3xl font-mono text-xs text-dim">
        Las zonas transversales (inglés, entrevistas y Linux) no pertenecen a ninguna ruta: aparecen en todas, y su
        progreso es compartido. Avanzar inglés mientras cursas ciberseguridad también cuenta para backend.
      </p>
    </main>
  );
}
