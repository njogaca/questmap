"use client";

import { useEffect } from "react";
import type { Reward } from "@/lib/game";
import { DecryptText } from "./effects/DecryptText";
import { playSound } from "./effects/sound";

export function RewardBanner({ reward }: { reward: Reward | null | undefined }) {
  const has = !!reward && (reward.messages.length > 0 || reward.badges.length > 0 || !!reward.rankUp);

  useEffect(() => {
    if (!has || !reward) return;
    if (reward.rankUp) playSound("levelup");
    else if (reward.badges.length) playSound("badge");
    else if (reward.xp > 0) playSound("xp");
  }, [has, reward]);

  if (!has || !reward) return null;
  return (
    <div role="status" className="qm-pop rounded-md border border-done bg-done/10 p-4">
      {reward.xp > 0 && <p className="qm-glitch font-title text-2xl text-done">+{reward.xp} XP</p>}
      <ul className="mt-1 space-y-0.5 text-sm">
        {reward.messages.map((m) => (
          <li key={m}>› {m}</li>
        ))}
        {reward.badges.map((b) => (
          <li key={b} className="text-warn">
            ◆ Insignia: {b}
          </li>
        ))}
        {reward.rankUp && (
          <li className="font-semibold text-available">
            ▲ Nuevo rango: <DecryptText text={reward.rankUp} durationMs={1200} />
          </li>
        )}
      </ul>
    </div>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-progress">
      {error}
    </p>
  );
}
