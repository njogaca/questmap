"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markReviewDone } from "@/app/claude-actions";

/** Refuerzo generado por un `gap` de Claude: repasar el tema y marcarlo como hecho (registra minutos). */
export function ReviewItem({ id, topic }: { id: number; topic: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const search = `https://www.google.com/search?q=${encodeURIComponent(topic)}`;
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-warn/40 bg-surface-2 px-3 py-2 text-sm">
      <a href={search} target="_blank" rel="noreferrer" className={`min-w-0 truncate hover:text-available ${done ? "line-through opacity-50" : ""}`}>
        {topic} ↗
      </a>
      <button
        type="button"
        disabled={pending || done}
        className="shrink-0 rounded border border-line px-2 py-1 font-mono text-xs text-dim hover:border-done hover:text-done disabled:opacity-40"
        onClick={() =>
          start(async () => {
            const r = await markReviewDone(id, 10);
            if (r.ok) {
              setDone(true);
              router.refresh();
            }
          })
        }
      >
        repasado · 10 min
      </button>
    </li>
  );
}
