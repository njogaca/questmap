"use client";

import type { Reward } from "@/lib/game";

export function RewardBanner({ reward }: { reward: Reward | null | undefined }) {
  if (!reward || (!reward.messages.length && !reward.badges.length && !reward.rankUp)) return null;
  return (
    <div role="status" className="rounded-md border border-done bg-done/10 p-4">
      {reward.xp > 0 && <p className="font-title text-2xl text-done">+{reward.xp} XP</p>}
      <ul className="mt-1 space-y-0.5 text-sm">
        {reward.messages.map((m) => (
          <li key={m}>› {m}</li>
        ))}
        {reward.badges.map((b) => (
          <li key={b} className="text-warn">
            ◆ Insignia: {b}
          </li>
        ))}
        {reward.rankUp && <li className="font-semibold text-available">▲ Nuevo rango: {reward.rankUp}</li>}
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
