import { addDays, daysBetween, weekStart } from "./time";

export const STREAK_MIN_MINUTES = 10;

export type StreakResult = {
  current: number;
  best: number;
  /** ¿Ya se usó la congelación de la semana actual (lunes–domingo)? */
  freezeUsedThisWeek: boolean;
  todayMinutes: number;
  /** ¿Hoy ya cuenta (≥ 10 min)? */
  todayDone: boolean;
};

/**
 * Racha derivada de study_log (sección 5 del SPEC):
 * - Un día cuenta si suma ≥ 10 min.
 * - 1 congelación automática por semana (lunes–domingo): el primer día sin estudio la consume
 *   y la racha no se rompe (ese día no suma); el segundo día sin estudio de la semana la rompe.
 * - El jueves no tiene trato especial.
 * - Hoy todavía no cuenta como fallo: el día no ha terminado.
 */
export function computeStreak(minutesByDate: Record<string, number>, today: string): StreakResult {
  const dates = Object.keys(minutesByDate)
    .filter((d) => d <= today)
    .sort();
  const todayMinutes = minutesByDate[today] ?? 0;
  const todayDone = todayMinutes >= STREAK_MIN_MINUTES;
  const firstStudy = dates.find((d) => (minutesByDate[d] ?? 0) >= STREAK_MIN_MINUTES);
  if (!firstStudy) return { current: 0, best: 0, freezeUsedThisWeek: false, todayMinutes, todayDone };

  let current = 0;
  let best = 0;
  const freezesByWeek = new Set<string>();
  const total = daysBetween(firstStudy, today);

  for (let i = 0; i <= total; i++) {
    const day = addDays(firstStudy, i);
    const studied = (minutesByDate[day] ?? 0) >= STREAK_MIN_MINUTES;
    if (studied) {
      current++;
      best = Math.max(best, current);
      continue;
    }
    if (day === today) break; // el día de hoy aún puede completarse
    if (current === 0) continue; // sin racha activa no hay nada que proteger
    const wk = weekStart(day);
    if (!freezesByWeek.has(wk)) {
      freezesByWeek.add(wk); // congelación: la racha se mantiene, el día no suma
    } else {
      current = 0; // segundo día sin estudio en la semana: se rompe
    }
  }

  return {
    current,
    best,
    freezeUsedThisWeek: freezesByWeek.has(weekStart(today)),
    todayMinutes,
    todayDone,
  };
}
