/** Calificación de preguntas de quiz (pura). */

export const QUIZ_PASS_PERCENT = 80;

export type QuizQuestionPayload = {
  prompt: string;
  options?: string[];
  answer: number | boolean | string | (number | string)[];
  explanation: string;
  skill: string;
  difficulty: number;
  hint?: string;
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

/**
 * - mcq: respuesta = índice de la opción correcta.
 * - tf: respuesta = boolean.
 * - order: respuesta = arreglo de índices de `options` en el orden correcto.
 * - fill: respuesta = texto, o arreglo de textos aceptados (sin importar mayúsculas ni acentos).
 */
export function gradeAnswer(type: string, q: QuizQuestionPayload, given: unknown): boolean {
  switch (type) {
    case "mcq":
      return Number(given) === Number(q.answer);
    case "tf": {
      // Puede venir como { value, justification } (la justificación se guarda, no se califica).
      const v = given && typeof given === "object" && "value" in given ? (given as { value: unknown }).value : given;
      return v === q.answer || String(v) === String(q.answer);
    }
    case "order": {
      const expected = Array.isArray(q.answer) ? q.answer.map(Number) : [];
      return Array.isArray(given) && given.length === expected.length && given.every((v, i) => Number(v) === expected[i]);
    }
    case "fill": {
      const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map((a) => norm(String(a)));
      return typeof given === "string" && accepted.includes(norm(given));
    }
    default:
      return false;
  }
}

export function scorePercent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** Barajar (Fisher–Yates). */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
