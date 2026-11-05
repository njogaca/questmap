"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeMicro } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { Flashcards, type Card } from "../Flashcards";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnPrimary } from "../ui";

/**
 * Micro-quest (≤ 15 min). Según payload.kind:
 * - flashcards (por defecto): repasa tarjetas de la zona.
 * - speaking / writing: graba o escribe una frase y pega la transcripción.
 * - reading: lee el recurso y marca como hecho.
 */
export function MicroQuest({
  slug,
  kind,
  instructions,
  cards,
  completed,
}: {
  slug: string;
  kind: string;
  instructions: string | null;
  cards: Card[];
  completed: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [reviewed, setReviewed] = useState(false);

  const done = (t?: string) =>
    start(async () => {
      const r = await completeMicro(slug, t);
      if (!r.ok) return setError(r.error);
      setReward(r.reward);
      router.refresh();
    });

  if (completed && !reward) return <p className="text-sm text-done">✓ Micro-quest completada.</p>;

  return (
    <div className="space-y-4">
      {instructions && <p className="leading-relaxed">{instructions}</p>}

      {kind === "flashcards" && !reviewed && (
        <Flashcards
          cards={cards}
          onFinish={() => {
            setReviewed(true);
            done();
          }}
        />
      )}

      {(kind === "speaking" || kind === "writing") && !reward && (
        <>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-line bg-surface p-3 text-sm"
            placeholder={kind === "speaking" ? "Pega aquí la transcripción de lo que dijiste (en inglés)…" : "Escribe tu frase en inglés…"}
          />
          <button className={btnPrimary} disabled={pending} onClick={() => done(text)}>
            Completar
          </button>
        </>
      )}

      {kind === "reading" && !reward && (
        <button className={btnPrimary} disabled={pending} onClick={() => done()}>
          Ya lo leí
        </button>
      )}

      {kind === "flashcards" && cards.length === 0 && !reward && (
        <button className={btnPrimary} disabled={pending} onClick={() => done()}>
          Marcar como hecha
        </button>
      )}

      <RewardBanner reward={reward} />
      <ErrorText error={error} />
    </div>
  );
}
