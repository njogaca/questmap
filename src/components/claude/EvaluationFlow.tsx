"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  gradeEvaluationWithApi,
  prepareEvaluation,
  submitEvaluationResponse,
  type GradeOutcome,
} from "@/app/claude-actions";
import type { Grading } from "@/lib/claude/grading";
import type { Reward } from "@/lib/game";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnGhost, btnPrimary } from "../ui";
import { GradeView } from "./GradeView";
import { ModeAPanel } from "./ModeAPanel";

/**
 * Flujo de calificación con Claude:
 * respuesta → preparar prompt → Modo B (API, si está configurada) o Modo A (copiar/pegar) → resultado.
 * Si la API falla, cae al Modo A sin perder la respuesta.
 */
export function EvaluationFlow({
  kind,
  questSlug,
  answer,
  onEditAnswer,
  disabled,
}: {
  kind: "open_answer" | "lab_review";
  questSlug: string;
  answer: string;
  onEditAnswer?: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<{ id: number; prompt: string; apiAvailable: boolean } | null>(null);
  const [result, setResult] = useState<{ grading: Grading; reward?: Reward } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const handle = (r: GradeOutcome) => {
    if (!r.ok) return setError(r.error);
    setError(null);
    setResult({ grading: r.grading, reward: r.reward });
    router.refresh();
  };

  if (result)
    return (
      <div className="space-y-3">
        <GradeView grading={result.grading} />
        <RewardBanner reward={result.reward} />
        <button
          className={btnGhost}
          onClick={() => {
            setResult(null);
            setPrepared(null);
            onEditAnswer?.();
          }}
        >
          Mejorar mi respuesta y volver a calificar
        </button>
      </div>
    );

  if (!prepared)
    return (
      <div className="space-y-2">
        <button
          className={btnPrimary}
          disabled={disabled || pending || answer.trim().length < 20}
          onClick={() =>
            start(async () => {
              const r = await prepareEvaluation(kind, questSlug, answer);
              if (!r.ok) return setError(r.error);
              setError(null);
              setPrepared(r);
            })
          }
        >
          {kind === "lab_review" ? "Pedir revisión a Claude" : "Calificar con Claude"}
        </button>
        <ErrorText error={error} />
      </div>
    );

  return (
    <div className="space-y-3">
      {prepared.apiAvailable && (
        <div className="space-y-2 rounded-md border border-available/50 bg-surface p-4">
          <p className="font-mono text-xs text-available">Modo B — con API</p>
          <button
            className={btnPrimary}
            disabled={pending}
            onClick={() => start(async () => handle(await gradeEvaluationWithApi(prepared.id)))}
          >
            {pending ? "Claude está calificando…" : "Calificar ahora con la API"}
          </button>
        </div>
      )}
      <ModeAPanel
        prompt={prepared.prompt}
        pending={pending}
        onSubmit={(pasted) => start(async () => handle(await submitEvaluationResponse(prepared.id, pasted)))}
      />
      <ErrorText error={error} />
    </div>
  );
}
