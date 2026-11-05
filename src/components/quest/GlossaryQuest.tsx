"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishGlossaryQuest } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { GLOSSARY_PASS_PERCENT } from "@/lib/rules";
import type { SrsGrade } from "@/lib/srs";
import { Flashcards, type Card } from "../Flashcards";
import { ErrorText, RewardBanner } from "../RewardBanner";
import { btnPrimary } from "../ui";

export function GlossaryQuest({ slug, cards, completed }: { slug: string; cards: Card[]; completed: boolean }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ passed: boolean; percent: number; reward?: Reward } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [studying, setStudying] = useState(!completed);

  const onFinish = (grades: SrsGrade[]) =>
    start(async () => {
      const r = await finishGlossaryQuest(slug, grades);
      if (!r.ok) return setError(r.error);
      setResult(r);
      router.refresh();
    });

  if (!studying)
    return (
      <div className="space-y-3">
        <p className="text-sm text-done">✓ Completaste este glosario. Sus términos ya están en tu repaso diario.</p>
        <button className={btnPrimary} onClick={() => setStudying(true)}>
          Repasar otra vez
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-dim">
        Repasa los {cards.length} términos. Para completar la quest, al menos el {GLOSSARY_PASS_PERCENT} % deben quedar en
        &ldquo;Bien&rdquo; o &ldquo;Fácil&rdquo;. Cada tarjeta entra a tu repaso espaciado.
      </p>
      {result ? (
        <div className="space-y-3">
          {result.passed ? (
            <RewardBanner reward={result.reward} />
          ) : (
            <p className="rounded-md border border-progress p-3 text-sm">
              Sacaste {result.percent} % en &ldquo;Bien/Fácil&rdquo;. Necesitas {GLOSSARY_PASS_PERCENT} %. Vuelve a repasar.
            </p>
          )}
          <button
            className={btnPrimary}
            onClick={() => {
              setResult(null);
              setRound((r) => r + 1);
            }}
          >
            {result.passed ? "Repasar otra vez" : "Reintentar"}
          </button>
        </div>
      ) : (
        <Flashcards key={round} cards={cards} onFinish={onFinish} />
      )}
      {pending && <p className="font-mono text-xs text-dim">guardando…</p>}
      <ErrorText error={error} />
    </div>
  );
}
