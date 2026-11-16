/** Reglas compartidas entre cliente y servidor. */
export const LEARN_NOTE_MIN_CHARS = 60;
export const GLOSSARY_PASS_PERCENT = 80;
export const DAILY_REVIEW_MIN_CARDS = 5;

/* ---------------------------------------------------------------------------
 * Ruta "de esfuerzo": los puntos salen SOLO de horas anotadas y de commits.
 * Leer, repasar glosario, pasar un quiz o completar un nivel no dan puntos ahí.
 * Las demás rutas conservan las reglas originales (XP por tipo de quest + bonos).
 * ------------------------------------------------------------------------- */
export const EFFORT_TRACK_SLUG = "plan-2027";

/** 10 puntos por cada 30 minutos anotados por el usuario (1 punto cada 3 minutos). */
export function effortXp(minutes: number): number {
  return Math.max(0, Math.round(minutes / 3));
}

/** Enlace a un commit concreto: .../commit/<hash> (GitHub, GitLab, Bitbucket...). */
export const COMMIT_URL_RE = /https?:\/\/\S+\/commits?\/[0-9a-f]{7,40}/i;

/** Valor de `payload.proof` en un lab que exige commit u horas para darse por hecho. */
export const PROOF_COMMIT_OR_HOURS = "commit_or_hours";

/** Misiones diarias fijas. `minutes: 0` = solo se marca (no es estudio, no da puntos). */
export const DAILY_MISSIONS = [
  { key: "english", label: "Inglés", minutes: 20 },
  { key: "java", label: "Java", minutes: 30 },
  { key: "gym", label: "Gimnasio", minutes: 0 },
] as const;
export type DailyMissionKey = (typeof DAILY_MISSIONS)[number]["key"];
