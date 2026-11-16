/** XP, rangos y bonos (sección 5 del SPEC). */

export const LEVEL_BONUS_XP = 100;
export const ZONE_BONUS_XP = 300;
export const QUIZ_EXCELLENCE_BONUS = 10; // quiz ≥ 95 %
export const DAILY_REVIEW_XP = 10; // repaso diario de glosario (micro por defecto), 1 vez al día
export const HINT_PENALTY = 0.2; // ver ≥ 1 pista reduce el XP de esa quest un 20 %

export const RANKS = [
  { name: "Novice", minXp: 0 },
  { name: "Apprentice", minXp: 500 },
  { name: "Junior Dev", minXp: 1500 },
  { name: "Backend Dev", minXp: 3500 },
  { name: "Distributed Systems Engineer", minXp: 7000 },
  { name: "Home Depot Ready", minXp: 12000 },
] as const;

export function rankFor(xp: number) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].minXp) idx = i;
  const next = RANKS[idx + 1];
  const cur = RANKS[idx];
  return {
    name: cur.name,
    index: idx,
    nextName: next?.name ?? null,
    nextAt: next?.minXp ?? null,
    /** 0–100 hacia el siguiente rango. */
    percentToNext: next ? Math.round(((xp - cur.minXp) / (next.minXp - cur.minXp)) * 100) : 100,
  };
}

/** XP final de una quest al completarla. */
export function questXpAwarded(opts: { baseXp: number; type: string; hintsUsed: number; quizScore?: number }): number {
  let xp = opts.baseXp;
  // Un quiz que vale 0 (ruta de esfuerzo) tampoco da el bono de excelencia.
  if (opts.type === "quiz" && opts.baseXp > 0 && (opts.quizScore ?? 0) >= 95) xp += QUIZ_EXCELLENCE_BONUS;
  if (opts.hintsUsed > 0) xp = Math.round(xp * (1 - HINT_PENALTY));
  return xp;
}
