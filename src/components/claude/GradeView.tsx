import type { Grading } from "@/lib/claude/grading";
import { PASS_SCORE } from "@/lib/claude/grading";

const CRITERIA_ES: Record<string, string> = {
  correctness: "Exactitud",
  depth: "Profundidad",
  clarity: "Claridad",
  tradeoffs: "Trade-offs",
};

function color(score: number) {
  return score >= PASS_SCORE ? "var(--na-done)" : score >= 50 ? "var(--na-warn)" : "var(--na-progress)";
}

export function GradeView({ grading, feedback }: { grading: Grading; feedback?: string | null }) {
  const passed = grading.score >= PASS_SCORE;
  return (
    <div className="space-y-4 rounded-md border bg-surface p-4" style={{ borderColor: color(grading.score) }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-title text-4xl" style={{ color: color(grading.score) }}>
          {grading.score}
          <span className="text-lg text-dim">/100</span>
        </p>
        <p className="font-mono text-sm" style={{ color: color(grading.score) }}>
          {passed ? `✓ aprobado (≥ ${PASS_SCORE})` : `✗ no aprobado (necesitas ${PASS_SCORE})`}
        </p>
      </div>

      {grading.criteria.length > 0 && (
        <ul className="space-y-2">
          {grading.criteria.map((c) => (
            <li key={c.name}>
              <div className="flex justify-between text-sm">
                <span>{CRITERIA_ES[c.name] ?? c.name}</span>
                <span className="font-mono text-xs" style={{ color: color(c.score) }}>
                  {c.score}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-surface-2">
                <div className="h-full" style={{ width: `${c.score}%`, background: color(c.score) }} />
              </div>
              {c.comment && <p className="mt-1 text-xs leading-relaxed text-dim">{c.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <details className="rounded bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer font-mono text-xs text-dim">revisión completa de Claude</summary>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{feedback}</p>
        </details>
      )}

      {grading.english_feedback.length > 0 && (
        <div>
          <p className="font-mono text-xs text-available">tu inglés</p>
          <ul className="mt-1 space-y-2">
            {grading.english_feedback.map((e, i) => (
              <li key={i} className="rounded bg-surface-2 p-2 text-sm">
                <p className="text-progress line-through decoration-1">{e.original}</p>
                <p className="text-done">{e.better}</p>
                {e.why_es && <p className="mt-0.5 text-xs text-dim">{e.why_es}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {grading.gaps.length > 0 && (
        <div>
          <p className="font-mono text-xs text-warn">para repasar (se agregaron a tus refuerzos del día)</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {grading.gaps.map((g) => (
              <li key={g} className="rounded border border-warn/50 px-2 py-0.5 text-xs">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {grading.next_step && (
        <p className="text-sm">
          <span className="font-mono text-xs text-available">siguiente paso › </span>
          {grading.next_step}
        </p>
      )}
    </div>
  );
}
