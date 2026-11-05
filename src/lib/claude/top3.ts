import type { Grading } from "./grading";

const CRITERIA_ES: Record<string, string> = {
  correctness: "Exactitud",
  depth: "Profundidad",
  clarity: "Claridad",
  tradeoffs: "Trade-offs",
};

/** "Top 3 cosas a mejorar": los criterios más bajos (con su comentario); si faltan, se completan con los gaps. */
export function topImprovements(g: Grading): string[] {
  const fromCriteria = [...g.criteria]
    .sort((a, b) => a.score - b.score)
    .filter((c) => c.comment && c.score < 90)
    .map((c) => `${CRITERIA_ES[c.name] ?? c.name} (${c.score}): ${c.comment}`);
  const items = [...fromCriteria, ...g.gaps.map((x) => `Repasar: ${x}`)];
  if (g.english_feedback[0]) items.push(`Inglés: di "${g.english_feedback[0].better}" en lugar de "${g.english_feedback[0].original}".`);
  return items.slice(0, 3);
}
