"use client";

import { useState, useTransition } from "react";
import { reviewTerm } from "@/app/actions";
import type { SrsGrade } from "@/lib/srs";
import { RichText } from "./RichText";
import { btnGhost } from "./ui";

export type Card = {
  id: number;
  term: string;
  category: string | null;
  definitionEs: string;
  definitionEn: string;
  exampleEn: string | null;
  analogyMq: string | null;
};

const GRADES: { grade: SrsGrade; label: string; hint: string; color: string }[] = [
  { grade: "again", label: "Otra vez", hint: "no la sabía", color: "var(--na-progress)" },
  { grade: "hard", label: "Difícil", hint: "con esfuerzo", color: "var(--na-warn)" },
  { grade: "good", label: "Bien", hint: "la sabía", color: "var(--na-available)" },
  { grade: "easy", label: "Fácil", hint: "sin pensar", color: "var(--na-done)" },
];

/**
 * Sesión de flashcards. Cada calificación actualiza el SRS en el servidor.
 * Llama a `onFinish` con las calificaciones (en orden) al terminar el mazo.
 */
export function Flashcards({ cards, onFinish }: { cards: Card[]; onFinish: (grades: SrsGrade[]) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<SrsGrade[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!cards.length) return <p className="text-sm text-dim">No hay tarjetas para repasar.</p>;
  if (index >= cards.length) return null;
  const card = cards[index];

  const grade = (g: SrsGrade) =>
    startTransition(async () => {
      const r = await reviewTerm(card.id, g);
      if (!r.ok) return setError(r.error);
      setError(null);
      const next = [...grades, g];
      setGrades(next);
      setFlipped(false);
      if (index + 1 >= cards.length) onFinish(next);
      setIndex(index + 1);
    });

  return (
    <div>
      <div className="mb-2 flex justify-between font-mono text-xs text-dim">
        <span>
          tarjeta {index + 1}/{cards.length}
        </span>
        {card.category && <span>{card.category}</span>}
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="block min-h-56 w-full rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:border-available"
        aria-label={flipped ? "Ocultar respuesta" : "Mostrar respuesta"}
      >
        <p className="font-mono text-2xl text-available">{card.term}</p>
        {!flipped ? (
          <p className="mt-6 text-sm text-dim">¿Qué significa? Piénsalo y toca la tarjeta para ver la respuesta.</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm leading-relaxed">
            <p><RichText text={card.definitionEs} /></p>
            <p className="text-dim">
              <span className="font-mono text-xs">EN · </span>
              {card.definitionEn}
            </p>
            {card.exampleEn && (
              <p className="border-l-2 border-available pl-3 italic">&ldquo;{card.exampleEn}&rdquo;</p>
            )}
            {card.analogyMq && (
              <p className="rounded bg-surface-2 p-2 text-xs">
                <span className="font-mono text-warn">MQ/IIB › </span>
                {card.analogyMq}
              </p>
            )}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              type="button"
              disabled={pending}
              onClick={() => grade(g.grade)}
              className="rounded border px-2 py-2 text-center font-mono text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
              style={{ borderColor: g.color, color: g.color }}
            >
              {g.label}
              <span className="block text-[11px] opacity-70">{g.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => setFlipped(true)}>
          Mostrar respuesta
        </button>
      )}
      {error && <p className="mt-2 text-sm text-progress">{error}</p>}
    </div>
  );
}
