/**
 * Calificación de Claude (sección 9 del SPEC): esquema del JSON y parser tolerante.
 * Funciona igual para Modo A (texto pegado desde claude.ai) y Modo B (respuesta de la API).
 */
import { z } from "zod";

export const PASS_SCORE = 70;
export const CRITERIA = ["correctness", "depth", "clarity", "tradeoffs"] as const;

const score = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))));

export const gradingSchema = z.object({
  score,
  criteria: z
    .array(z.object({ name: z.string(), score, comment: z.string().default("") }))
    .default([]),
  english_feedback: z
    .array(z.object({ original: z.string(), better: z.string(), why_es: z.string().default("") }))
    .default([]),
  gaps: z.array(z.string()).default([]),
  next_step: z.string().default(""),
});
export type Grading = z.infer<typeof gradingSchema>;

/** Encuentra objetos JSON balanceados `{...}` de NIVEL SUPERIOR (no anidados) en un texto. */
function findJsonObjects(text: string): string[] {
  const found: string[] = [];
  let start = text.indexOf("{");
  while (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) {
      // Llave sin cerrar (ej. código suelto): prueba desde la siguiente.
      start = text.indexOf("{", start + 1);
      continue;
    }
    found.push(text.slice(start, end + 1));
    start = text.indexOf("{", end + 1);
  }
  return found;
}

/**
 * Extrae la calificación del texto de Claude. Prioriza bloques ```json; si no hay,
 * busca el ÚLTIMO objeto JSON que tenga "score". Devuelve null si no encuentra nada válido.
 */
export function extractGrading(text: string): Grading | null {
  // Prioridad: bloques con fences (el último primero), luego objetos sueltos de nivel superior (el último primero).
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim()).reverse();
  const loose = findJsonObjects(text.replace(/```(?:json)?\s*[\s\S]*?```/gi, "")).reverse();

  for (const raw of [...fenced, ...loose]) {
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !("score" in obj)) continue;
      const parsed = gradingSchema.safeParse(obj);
      if (parsed.success) return parsed.data;
    } catch {
      // probar el siguiente candidato
    }
  }
  return null;
}

export function isPassing(g: Grading) {
  return g.score >= PASS_SCORE;
}

/** Texto (sin el JSON) para guardar como feedback legible. */
export function stripJson(text: string): string {
  return text
    .replace(/```(?:json)?\s*[\s\S]*?```/gi, "")
    .trim();
}
