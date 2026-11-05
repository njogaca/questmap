/** Repetición espaciada: SM-2 simplificado con 4 botones (again / hard / good / easy). */

export type SrsGrade = "again" | "hard" | "good" | "easy";
export type SrsState = { ease: number; intervalDays: number; reps: number; lapses: number };

export const SRS_NEW: SrsState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };

const QUALITY: Record<SrsGrade, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export function reviewCard(state: SrsState, grade: SrsGrade, now: Date = new Date()): SrsState & { dueAt: Date } {
  const q = QUALITY[grade];
  let { ease, intervalDays, reps, lapses } = state;

  if (grade === "again") {
    reps = 0;
    lapses += 1;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    // Vuelve a salir en 10 minutos (misma sesión del día).
    return { ease, intervalDays, reps, lapses, dueAt: new Date(now.getTime() + 10 * 60_000) };
  }

  reps += 1;
  if (reps === 1) intervalDays = grade === "easy" ? 3 : 1;
  else if (reps === 2) intervalDays = grade === "hard" ? 3 : grade === "easy" ? 8 : 6;
  else {
    const factor = grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease;
    intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * factor));
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return { ease: Math.round(ease * 100) / 100, intervalDays, reps, lapses, dueAt: new Date(now.getTime() + intervalDays * 86_400_000) };
}
