"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInterview } from "@/app/claude-actions";
import type { InterviewMode } from "@/lib/claude/prompts";
import { btnGhost, btnPrimary } from "../ui";

export function StartInterviewButton({
  templateSlug,
  mode,
  label,
  primary,
  disabled,
}: {
  templateSlug?: string;
  mode?: InterviewMode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        className={`${primary ? btnPrimary : btnGhost} w-full`}
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const r = await createInterview({ templateSlug, mode });
            if (!r.ok) return setError(r.error);
            router.push(`/arena/session/${r.id}`);
          })
        }
      >
        {pending ? "Preparando…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-progress">{error}</p>}
    </div>
  );
}
