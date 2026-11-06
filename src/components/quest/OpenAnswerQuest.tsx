"use client";

import { useState } from "react";
import { BlockText } from "../BlockText";
import { EvaluationFlow } from "../claude/EvaluationFlow";

export function OpenAnswerQuest({
  slug,
  promptEn,
  completed,
  history,
}: {
  slug: string;
  promptEn: string;
  completed: boolean;
  history: { id: number; score: number | null; createdAt: string }[];
}) {
  const [answer, setAnswer] = useState("");
  const [locked, setLocked] = useState(false);

  return (
    <div className="space-y-5">
      <div className="rounded-md border-l-2 border-available bg-surface p-4">
        <p className="font-mono text-xs text-available">interviewer asks</p>
        <div className="mt-1 text-lg leading-relaxed">
          <BlockText text={promptEn} />
        </div>
      </div>
      <p className="text-sm text-dim">
        Responde en inglés, como lo harías en la entrevista (5–10 frases). Claude califica exactitud, profundidad, claridad y
        trade-offs, y corrige tu inglés. Apruebas con 70.
        {completed && " Ya completaste esta quest: puedes seguir practicando."}
      </p>
      <textarea
        rows={8}
        value={answer}
        disabled={locked}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full rounded-md border border-line bg-surface p-3 text-sm leading-relaxed"
        placeholder="Write your answer in English…"
      />
      <EvaluationFlow
        kind="open_answer"
        questSlug={slug}
        answer={answer}
        disabled={false}
        onEditAnswer={() => setLocked(false)}
      />
      {history.length > 0 && (
        <div>
          <p className="font-mono text-xs text-dim">intentos anteriores</p>
          <ul className="mt-1 space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between rounded bg-surface px-3 py-1.5">
                <span className="text-dim">{new Date(h.createdAt).toLocaleString("es")}</span>
                <span className="font-mono">{h.score === null ? "sin calificar" : `${h.score}/100`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
