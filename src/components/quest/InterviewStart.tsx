"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInterview } from "@/app/claude-actions";
import { ErrorText } from "../RewardBanner";
import { BlockText } from "../BlockText";
import { btnPrimary } from "../ui";

export type SessionSummary = { id: number; score: number | null; finishedAt: string | null; startedAt: string };

/** Quest `boss` (entregable + mini-entrevista) o `interview` (screen técnico de la zona). */
export function InterviewStart({
  slug,
  type,
  task,
  focus,
  completed,
  sessions,
}: {
  slug: string;
  type: "boss" | "interview";
  task?: string;
  focus?: string[];
  completed: boolean;
  sessions: SessionSummary[];
}) {
  const router = useRouter();
  const [deliverable, setDeliverable] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const begin = () =>
    start(async () => {
      const r = await createInterview({ questSlug: slug, deliverable: type === "boss" ? deliverable : undefined });
      if (!r.ok) return setError(r.error);
      router.push(`/arena/session/${r.id}`);
    });

  return (
    <div className="space-y-5">
      {type === "boss" ? (
        <>
          {task && (
            <div className="rounded-md border-l-2 border-progress bg-surface p-4 text-sm leading-relaxed">
              <p className="font-mono text-xs text-progress">la tarea del jefe</p>
              <div className="mt-1">
                <BlockText text={task} />
              </div>
            </div>
          )}
          {focus && focus.length > 0 && (
            <p className="text-sm text-dim">
              La mini-entrevista se enfocará en: <span className="text-ink">{focus.join(" · ")}</span>
            </p>
          )}
          <p className="text-sm text-dim">
            Requisitos para vencer al jefe: rúbrica de Claude ≥ 70 (esta quest) y el examen final del nivel ≥ 80 %. La entrevista es
            en inglés.
          </p>
          <label className="block text-sm">
            Tu entregable (URL del repo, diseño en texto/Mermaid o código pegado):
            <textarea
              rows={8}
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-surface p-3 font-mono text-xs"
              placeholder="https://github.com/… o tu diseño"
            />
          </label>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-dim">
          Mini-entrevista técnica en inglés sobre esta zona: 6 preguntas con repreguntas, como un screen real de Home Depot. Al
          final Claude califica tu respuesta y tu inglés. Apruebas con 70.
        </p>
      )}

      <button className={btnPrimary} disabled={pending || (type === "boss" && deliverable.trim().length < 20)} onClick={begin}>
        {pending ? "Preparando…" : type === "boss" ? "Enfrentar al jefe" : "Empezar entrevista"}
      </button>
      {completed && <p className="text-sm text-done">✓ Ya completaste esta quest. Puedes volver a practicar.</p>}
      <ErrorText error={error} />

      {sessions.length > 0 && (
        <div>
          <p className="font-mono text-xs text-dim">sesiones anteriores</p>
          <ul className="mt-1 space-y-1 text-sm">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/arena/session/${s.id}`} className="flex justify-between rounded bg-surface px-3 py-1.5 hover:bg-surface-2">
                  <span className="text-dim">{new Date(s.startedAt).toLocaleString("es")}</span>
                  <span className="font-mono">{s.score === null ? "en curso" : `${s.score}/100`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
