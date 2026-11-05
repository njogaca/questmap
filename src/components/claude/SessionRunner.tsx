"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  interviewEvaluationPrompt,
  interviewFinishWithApi,
  interviewNextTurn,
  interviewSubmitManual,
  type GradeOutcome,
} from "@/app/claude-actions";
import type { Reward } from "@/lib/game";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnGhost, btnPrimary } from "../ui";
import { ModeAPanel } from "./ModeAPanel";

export type Turn = { id: number; role: string; content: string };

function Timer({ startedAt, durationMin }: { startedAt: string; durationMin?: number }) {
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const over = durationMin ? elapsed > durationMin * 60 : false;
  return (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      className="font-mono text-sm"
      style={{ color: over ? "var(--na-progress)" : "var(--na-text-dim)" }}
      title="Mostrar/ocultar temporizador"
    >
      {visible ? `⏱ ${mm}:${ss}${durationMin ? ` / ${durationMin}:00` : ""}` : "⏱ —"}
    </button>
  );
}

export function SessionRunner({
  sessionId,
  startedAt,
  durationMin,
  turns,
  prompt,
  apiAvailable,
  endMarker,
}: {
  sessionId: number;
  startedAt: string;
  durationMin?: number;
  turns: Turn[];
  prompt: string;
  apiAvailable: boolean;
  endMarker: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"api" | "manual">(apiAvailable ? "api" : "manual");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [evalPrompt, setEvalPrompt] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const dialog = turns.filter((t) => t.role === "user" || t.role === "assistant");
  const lastAssistant = [...dialog].reverse().find((t) => t.role === "assistant");
  const interviewerDone = !!lastAssistant?.content.includes(endMarker);
  const waitingForInterviewer = dialog.length > 0 && dialog.at(-1)?.role === "user";

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns.length]);

  const handleGrade = (r: GradeOutcome) => {
    if (!r.ok) {
      if (r.needsEvaluation) {
        setEvalPrompt(r.needsEvaluation);
        setMode("manual");
        setError(
          evalPrompt === null && mode === "manual"
            ? "Eso no traía calificación: guardé tu transcripción. Ahora copia el prompt de evaluación (paso 2), pégalo en claude.ai y pega aquí su respuesta."
            : `${r.error} Puedes calificar en claude.ai con el prompt de evaluación (paso 2).`,
        );
      } else setError(r.error);
      return;
    }
    setError(null);
    setReward(r.reward ?? null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded border border-line p-1 font-mono text-xs">
          <button
            type="button"
            disabled={!apiAvailable}
            onClick={() => setMode("api")}
            className={`rounded px-3 py-1 ${mode === "api" ? "bg-available text-bg" : "text-dim"} disabled:opacity-40`}
            title={apiAvailable ? "" : "Configura ANTHROPIC_API_KEY y CLAUDE_MODEL para usar el Modo B"}
          >
            Modo B · en la app
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded px-3 py-1 ${mode === "manual" ? "bg-available text-bg" : "text-dim"}`}
          >
            Modo A · claude.ai
          </button>
        </div>
        <Timer startedAt={startedAt} durationMin={durationMin} />
      </div>

      {mode === "api" ? (
        <div className="space-y-3">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-md border border-line bg-surface p-4">
            {dialog.length === 0 && <p className="text-sm text-dim">El entrevistador está listo. Presiona &ldquo;Comenzar&rdquo;.</p>}
            {dialog.slice(dialog[0]?.role === "user" ? 1 : 0).map((t) => (
              <div key={t.id} className={t.role === "assistant" ? "pr-8" : "pl-8"}>
                <p className="font-mono text-[11px] text-dim">{t.role === "assistant" ? "interviewer" : "you"}</p>
                <p
                  className={`mt-0.5 whitespace-pre-line rounded-md p-3 text-sm leading-relaxed ${
                    t.role === "assistant" ? "bg-surface-2" : "border border-available/40"
                  }`}
                >
                  {t.content}
                </p>
              </div>
            ))}
            {pending && <p className="font-mono text-xs text-available">el entrevistador está escribiendo…</p>}
            <div ref={endRef} />
          </div>

          {dialog.length === 0 ? (
            <button className={btnPrimary} disabled={pending} onClick={() => start(async () => {
              const r = await interviewNextTurn(sessionId);
              if (!r.ok) return setError(r.error);
              setError(null);
              router.refresh();
            })}>
              Comenzar
            </button>
          ) : (
            <>
              {!interviewerDone && (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full rounded-md border border-line bg-surface p-3 text-sm"
                    placeholder="Your answer in English… (tip: Win + H para dictar)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={btnPrimary}
                      disabled={pending || (!answer.trim() && !waitingForInterviewer)}
                      onClick={() =>
                        start(async () => {
                          const r = await interviewNextTurn(sessionId, answer);
                          if (!r.ok) return setError(`${r.error} Tu respuesta quedó guardada: puedes reintentar o seguir en el Modo A.`);
                          setError(null);
                          setAnswer("");
                          router.refresh();
                        })
                      }
                    >
                      {waitingForInterviewer && !answer.trim() ? "Reintentar" : "Enviar respuesta"}
                    </button>
                  </div>
                </div>
              )}
              <button
                className={interviewerDone ? btnPrimary : btnGhost}
                disabled={pending}
                onClick={() => start(async () => handleGrade(await interviewFinishWithApi(sessionId)))}
              >
                {pending ? "Calificando…" : "Terminar y calificar"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {evalPrompt ? (
            <ModeAPanel
              title="Paso 2 — prompt de evaluación"
              prompt={evalPrompt}
              pending={pending}
              onSubmit={(p) => start(async () => handleGrade(await interviewSubmitManual(sessionId, p)))}
            />
          ) : (
            <>
              <p className="text-sm text-dim">
                Claude hará la entrevista turno a turno en claude.ai. Responde allí en inglés; al final te dará la calificación con un
                bloque JSON. Pega aquí esa respuesta final (o toda la conversación).
              </p>
              <ModeAPanel
                prompt={prompt}
                pending={pending}
                pasteLabel="Pega la respuesta final de Claude (con el JSON) o la transcripción completa:"
                onSubmit={(p) => start(async () => handleGrade(await interviewSubmitManual(sessionId, p)))}
              />
              {dialog.length > 2 && (
                <button
                  className={btnGhost}
                  onClick={() =>
                    start(async () => {
                      const r = await interviewEvaluationPrompt(sessionId);
                      if (r.ok) setEvalPrompt(r.prompt);
                      else setError(r.error);
                    })
                  }
                >
                  Calificar en claude.ai lo que ya respondí en la app
                </button>
              )}
            </>
          )}
        </div>
      )}
      <RewardBanner reward={reward} />
      <ErrorText error={error} />
    </div>
  );
}
