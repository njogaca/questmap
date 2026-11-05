"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkQuizAnswer, submitQuiz } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { QUIZ_PASS_PERCENT, shuffle } from "@/lib/quiz";
import { RichText } from "../RichText";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnGhost, btnPrimary } from "../ui";

/** Pregunta SIN respuesta ni explicación (eso solo lo sabe el servidor). */
export type ClientQuestion = {
  id: number;
  type: "mcq" | "tf" | "order" | "fill";
  prompt: string;
  options?: string[];
  hint?: string;
  difficulty: number;
};

type Feedback = { correct: boolean; explanation: string; correctAnswer: unknown };

export type QuizHistoryItem = { id: number; score: number | null; passed: boolean; finishedAt: string | null };

export function QuizRunner({
  slug,
  questions,
  history,
  completed,
}: {
  slug: string;
  questions: ClientQuestion[];
  history: QuizHistoryItem[];
  completed: boolean;
}) {
  const router = useRouter();
  const [deck, setDeck] = useState<ClientQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [hintsShown, setHintsShown] = useState<Set<number>>(new Set());
  const [startedAt, setStartedAt] = useState<string>("");
  const [result, setResult] = useState<{ score: number; passed: boolean; reward?: Reward } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const begin = () => {
    // Baraja preguntas y (para mcq) no cambia índices: las opciones se muestran en orden original.
    setDeck(shuffle(questions));
    setI(0);
    // Las preguntas de ordenar empiezan con los pasos desordenados.
    setAnswers(
      Object.fromEntries(
        questions
          .filter((q) => q.type === "order")
          .map((q) => [q.id, shuffle((q.options ?? []).map((_, k) => k))]),
      ),
    );
    setFeedback({});
    setHintsShown(new Set());
    setResult(null);
    setError(null);
    setStartedAt(new Date().toISOString());
  };

  if (!deck)
    return (
      <div className="space-y-4">
        <p className="text-sm text-dim">
          {questions.length} preguntas · apruebas con {QUIZ_PASS_PERCENT} % · reintentos ilimitados · ver una pista reduce
          el XP un 20 %.
        </p>
        <button className={btnPrimary} onClick={begin}>
          {completed ? "Practicar de nuevo" : history.length ? "Reintentar quiz" : "Comenzar quiz"}
        </button>
        <History history={history} />
      </div>
    );

  if (result)
    return (
      <div className="space-y-4">
        <div className={`rounded-md border p-4 ${result.passed ? "border-done" : "border-progress"}`}>
          <p className="font-title text-3xl" style={{ color: result.passed ? "var(--na-done)" : "var(--na-progress)" }}>
            {result.score} %
          </p>
          <p className="text-sm">
            {result.passed ? "Aprobado." : `No alcanzaste el ${QUIZ_PASS_PERCENT} %. Revisa las explicaciones y reintenta.`}
          </p>
        </div>
        <RewardBanner reward={result.reward} />
        <button className={btnPrimary} onClick={begin}>
          Intentar de nuevo
        </button>
      </div>
    );

  const q = deck[i];
  const fb = feedback[q.id];
  const answer = answers[q.id];
  const isLast = i === deck.length - 1;

  const setAnswer = (v: unknown) => !fb && setAnswers((a) => ({ ...a, [q.id]: v }));
  const hasAnswer =
    q.type === "fill"
      ? typeof answer === "string" && answer.trim() !== ""
      : q.type === "tf"
        ? !!answer && typeof (answer as { value?: unknown }).value === "boolean"
        : q.type === "order"
          ? true
          : answer !== undefined;

  const check = () =>
    start(async () => {
      const given = q.type === "order" ? (answer ?? (q.options ?? []).map((_, k) => k)) : answer;
      if (q.type === "order" && answer === undefined) setAnswers((a) => ({ ...a, [q.id]: given }));
      const r = await checkQuizAnswer(q.id, given);
      if (!r.ok) return setError(r.error);
      setError(null);
      setFeedback((f) => ({ ...f, [q.id]: r }));
    });

  const finish = () =>
    start(async () => {
      const r = await submitQuiz({
        questSlug: slug,
        answers: deck.map((d) => ({ questionId: d.id, answer: answers[d.id] ?? null })),
        hintsUsed: hintsShown.size,
        startedAt,
      });
      if (!r.ok) return setError(r.error);
      setResult(r);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between font-mono text-xs text-dim">
        <span>
          pregunta {i + 1}/{deck.length}
        </span>
        <span>{"◆".repeat(q.difficulty)}</span>
      </div>
      <div className="h-1 w-full bg-surface-2">
        <div className="h-full bg-available transition-[width]" style={{ width: `${((i + (fb ? 1 : 0)) / deck.length) * 100}%` }} />
      </div>

      <p className="text-lg leading-relaxed"><RichText text={q.prompt} /></p>

      {q.type === "mcq" && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt, k) => {
            const selected = answer === k;
            const isCorrect = fb && Number(fb.correctAnswer) === k;
            return (
              <button
                key={k}
                type="button"
                disabled={!!fb}
                onClick={() => setAnswer(k)}
                className={`block w-full rounded-md border p-3 text-left text-sm transition-colors ${
                  isCorrect
                    ? "border-done text-done"
                    : selected && fb
                      ? "border-progress text-progress"
                      : selected
                        ? "border-available bg-available/10"
                        : "border-line hover:border-ink"
                }`}
              >
                <span className="mr-2 font-mono text-dim">{String.fromCharCode(65 + k)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "tf" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => {
              const cur = (answer as { value?: boolean; justification?: string } | undefined) ?? {};
              const selected = cur.value === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  disabled={!!fb}
                  onClick={() => setAnswer({ ...cur, value: v })}
                  className={`rounded-md border p-3 font-mono text-sm ${
                    fb && fb.correctAnswer === v
                      ? "border-done text-done"
                      : selected
                        ? "border-available bg-available/10"
                        : "border-line hover:border-ink"
                  }`}
                >
                  {v ? "Verdadero" : "Falso"}
                </button>
              );
            })}
          </div>
          <textarea
            disabled={!!fb}
            rows={2}
            placeholder="Justifica en una línea por qué (no se califica, pero te ayuda a fijarlo)."
            className="w-full rounded-md border border-line bg-surface p-2 text-sm"
            value={(answer as { justification?: string } | undefined)?.justification ?? ""}
            onChange={(e) =>
              setAnswer({ ...((answer as object | undefined) ?? {}), justification: e.target.value })
            }
          />
        </div>
      )}

      {q.type === "fill" && (
        <input
          type="text"
          disabled={!!fb}
          className="w-full rounded-md border border-line bg-surface p-3 font-mono text-sm"
          placeholder="Escribe tu respuesta"
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && hasAnswer && !fb && check()}
        />
      )}

      {q.type === "order" && (
        <OrderInput
          options={q.options ?? []}
          value={(answer as number[] | undefined) ?? (q.options ?? []).map((_, k) => k)}
          disabled={!!fb}
          onChange={setAnswer}
        />
      )}

      {q.hint && !fb && (
        <div>
          {hintsShown.has(q.id) ? (
            <p className="rounded bg-surface-2 p-2 text-sm text-warn">Pista: {q.hint}</p>
          ) : (
            <button
              type="button"
              className="font-mono text-xs text-dim underline decoration-dotted hover:text-warn"
              onClick={() => setHintsShown((h) => new Set(h).add(q.id))}
            >
              ver pista (−20 % XP)
            </button>
          )}
        </div>
      )}

      {fb && (
        <div className={`rounded-md border p-3 text-sm ${fb.correct ? "border-done" : "border-progress"}`}>
          <p className="font-mono" style={{ color: fb.correct ? "var(--na-done)" : "var(--na-progress)" }}>
            {fb.correct ? "✓ Correcto" : "✗ Incorrecto"}
          </p>
          {!fb.correct && q.type === "fill" && <p className="mt-1">Respuesta esperada: {String(Array.isArray(fb.correctAnswer) ? fb.correctAnswer[0] : fb.correctAnswer)}</p>}
          {!fb.correct && q.type === "order" && Array.isArray(fb.correctAnswer) && (
            <ol className="mt-1 list-decimal pl-5">
              {(fb.correctAnswer as number[]).map((k) => (
                <li key={k}>{q.options?.[k]}</li>
              ))}
            </ol>
          )}
          <p className="mt-1 leading-relaxed"><RichText text={fb.explanation} /></p>
        </div>
      )}

      <div className="flex gap-2">
        {!fb ? (
          <button className={btnPrimary} disabled={!hasAnswer || pending} onClick={check}>
            Comprobar
          </button>
        ) : isLast ? (
          <button className={btnPrimary} disabled={pending} onClick={finish}>
            {pending ? "Calificando…" : "Terminar quiz"}
          </button>
        ) : (
          <button className={btnPrimary} onClick={() => setI(i + 1)}>
            Siguiente
          </button>
        )}
        <button className={btnGhost} onClick={() => setDeck(null)}>
          Salir
        </button>
      </div>
      <ErrorText error={error} />
    </div>
  );
}

function OrderInput({
  options,
  value,
  disabled,
  onChange,
}: {
  options: string[];
  value: number[];
  disabled: boolean;
  onChange: (v: number[]) => void;
}) {
  const move = (pos: number, dir: -1 | 1) => {
    const next = [...value];
    const target = pos + dir;
    if (target < 0 || target >= next.length) return;
    [next[pos], next[target]] = [next[target], next[pos]];
    onChange(next);
  };
  return (
    <ol className="space-y-2">
      {value.map((optIdx, pos) => (
        <li key={optIdx} className="flex items-center gap-2 rounded-md border border-line bg-surface p-2 text-sm">
          <span className="w-6 font-mono text-dim">{pos + 1}.</span>
          <span className="flex-1">{options[optIdx]}</span>
          <button type="button" disabled={disabled || pos === 0} onClick={() => move(pos, -1)} className="px-2 font-mono text-dim hover:text-available disabled:opacity-30" aria-label="Subir">
            ↑
          </button>
          <button type="button" disabled={disabled || pos === value.length - 1} onClick={() => move(pos, 1)} className="px-2 font-mono text-dim hover:text-available disabled:opacity-30" aria-label="Bajar">
            ↓
          </button>
        </li>
      ))}
    </ol>
  );
}

function History({ history }: { history: QuizHistoryItem[] }) {
  if (!history.length) return null;
  return (
    <div>
      <p className="font-mono text-xs text-dim">historial de intentos</p>
      <ul className="mt-1 space-y-1 text-sm">
        {history.map((h) => (
          <li key={h.id} className="flex justify-between rounded bg-surface px-3 py-1.5">
            <span className="text-dim">{h.finishedAt ? new Date(h.finishedAt).toLocaleString("es") : "—"}</span>
            <span className="font-mono" style={{ color: h.passed ? "var(--na-done)" : "var(--na-progress)" }}>
              {h.score ?? 0} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
