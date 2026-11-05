"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importProgressFile, resetZoneProgress } from "@/app/settings-actions";
import { ErrorText } from "./RewardBanner";
import { btnGhost, btnPrimary } from "./ui";

export function BackupPanel({ zones }: { zones: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [zone, setZone] = useState(zones[0]?.slug ?? "");
  const [confirm, setConfirm] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Exportar progreso (JSON)</h3>
        <p className="mt-1 text-sm text-dim">Descarga todo tu progreso. Guárdalo fuera de la PC (OneDrive, Google Drive…).</p>
        <a href="/api/export" className={`${btnPrimary} mt-2`}>
          Descargar JSON
        </a>
      </div>

      <form
        className="space-y-2"
        action={(fd) =>
          start(async () => {
            setMsg(null);
            setError(null);
            const r = await importProgressFile(fd);
            if (!r.ok) return setError(r.error);
            setMsg(
              `Importado: ${r.summary.questProgress} quests, ${r.summary.studyDays} días de estudio, ${r.summary.xpTotal} XP.` +
                (r.summary.skipped.length ? ` Omitidas (ya no existen en el contenido): ${r.summary.skipped.length}.` : ""),
            );
            router.refresh();
          })
        }
      >
        <h3 className="font-semibold">Importar progreso</h3>
        <p className="text-sm text-dim">Reemplaza tu progreso actual por el de un archivo exportado. Exporta antes por si acaso.</p>
        <input name="file" type="file" accept="application/json,.json" className="block text-sm file:mr-3 file:rounded file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-ink" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmImport}
            onChange={(e) => setConfirmImport(e.target.checked)}
            className="h-4 w-4 accent-[var(--na-progress)]"
          />
          Entiendo que esto REEMPLAZA todo mi progreso actual
        </label>
        <button className={btnGhost} disabled={pending || !confirmImport}>
          {pending ? "Importando…" : "Importar"}
        </button>
      </form>

      <div className="space-y-2 rounded-md border border-progress/50 p-3">
        <h3 className="font-semibold text-progress">Reiniciar una zona</h3>
        <p className="text-sm text-dim">
          Borra tus quests, intentos, entrevistas y XP de esa zona. Tus minutos de estudio (racha) se conservan.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="rounded border border-line bg-bg p-2 text-sm">
            {zones.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.title}
              </option>
            ))}
          </select>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={`escribe: ${zone}`}
            className="min-w-0 flex-1 rounded border border-line bg-bg p-2 font-mono text-sm"
          />
          <button
            type="button"
            className={btnGhost}
            disabled={pending || confirm.trim() !== zone}
            onClick={() =>
              start(async () => {
                setMsg(null);
                setError(null);
                const r = await resetZoneProgress(zone, confirm);
                if (!r.ok) return setError(r.error);
                setMsg(`Zona reiniciada (${r.quests} quests).`);
                setConfirm("");
                router.refresh();
              })
            }
          >
            Reiniciar zona
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-done">{msg}</p>}
      <ErrorText error={error} />
    </div>
  );
}
