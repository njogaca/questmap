"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishReviewSession } from "@/app/actions";
import type { Reward } from "@/lib/game";
import { DAILY_REVIEW_MIN_CARDS } from "@/lib/rules";
import { Flashcards, type Card } from "./Flashcards";
import { ErrorText, RewardBanner } from "./RewardBanner";
import { btnGhost, btnPrimary } from "./ui";

export function ReviewSession({ due, fresh }: { due: Card[]; fresh: Card[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"due" | "new" | null>(due.length ? "due" : null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finish = (count: number) =>
    start(async () => {
      const r = await finishReviewSession(count);
      if (!r.ok) return setError(r.error);
      setReward(r.reward);
      setMode(null);
      router.refresh();
    });

  if (reward)
    return (
      <div className="space-y-4">
        <RewardBanner reward={reward} />
        <Link href="/" className={btnPrimary}>
          Volver al inicio
        </Link>
      </div>
    );

  if (mode === "due") return <Flashcards cards={due} onFinish={(g) => finish(g.length)} />;
  if (mode === "new") return <Flashcards cards={fresh} onFinish={(g) => finish(g.length)} />;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {due.length === 0 ? "No tienes tarjetas vencidas. ¡Al día! " : ""}
        Repasar al menos {DAILY_REVIEW_MIN_CARDS} tarjetas al día da +10 XP (una vez por día).
      </p>
      <div className="flex flex-wrap gap-2">
        {due.length > 0 && (
          <button className={btnPrimary} onClick={() => setMode("due")}>
            Repasar {due.length} vencidas
          </button>
        )}
        {fresh.length > 0 && (
          <button className={due.length ? btnGhost : btnPrimary} onClick={() => setMode("new")}>
            Aprender {fresh.length} términos nuevos
          </button>
        )}
      </div>
      {pending && <p className="font-mono text-xs text-dim">guardando…</p>}
      <ErrorText error={error} />
    </div>
  );
}
