"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeDaily } from "@/app/actions";
import { btnPrimary } from "./ui";

export type DailyMissionRow = { key: string; label: string; minutes: number; done: boolean };

/** Las tres misiones fijas del día. Cada una se marca una vez por día local. */
export function DailyMissions({ missions }: { missions: DailyMissionRow[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mark = (key: string) =>
    start(async () => {
      const r = await completeDaily(key);
      setMsg(r.ok ? r.reward.messages.join(" · ") : r.error);
      router.refresh();
    });

  return (
    <div className="grid gap-2">
      {missions.map((m, i) => {
        const detail = m.minutes > 0 ? `${m.minutes} min` : "solo marcar";
        return m.done ? (
          <div key={m.key} className="hud-panel hud-panel-done p-3">
            <p className="font-mono text-xs text-done">
              {i + 1} · {detail} · hecho ✓
            </p>
            <p className="mt-0.5 text-dim line-through">{m.label}</p>
          </div>
        ) : (
          <div key={m.key} className="hud-item flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-mono text-xs text-available">
                {i + 1} · {detail}
              </p>
              <p className="mt-0.5">{m.label}</p>
            </div>
            <button className={btnPrimary} disabled={pending} onClick={() => mark(m.key)}>
              Hecho
            </button>
          </div>
        );
      })}
      {msg && <p className="font-mono text-xs text-dim">{msg}</p>}
    </div>
  );
}
