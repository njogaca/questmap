import { z } from "zod";

/** XP base por tipo de quest (sección 5 del SPEC). */
export const QUEST_XP = {
  learn: 20,
  glossary: 15,
  lab: 50,
  quiz: 40,
  open_answer: 40,
  interview: 60,
  boss: 150,
  micro: 10,
} as const;

/** Minutos estimados por defecto si el YAML no define `estimated_min`. */
export const DEFAULT_ESTIMATED_MIN = {
  micro: 10,
  glossary: 10,
  quiz: 15,
  learn: 30,
  open_answer: 30,
  interview: 30,
  lab: 60,
  boss: 90,
} as const;

export const questTypes = [
  "learn",
  "glossary",
  "lab",
  "quiz",
  "open_answer",
  "interview",
  "boss",
  "micro",
] as const;
export type QuestType = (typeof questTypes)[number];

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug debe ser kebab-case: minúsculas, números y guiones");

const status = z.enum(["published", "outline"]).default("published");

/**
 * `track` en una skill o una zona:
 *   - ausente  → el seed NO toca la ruta que ya tenga en la base (así el backfill sobrevive)
 *   - null     → transversal explícito: vale para todas las rutas
 *   - "<slug>" → pertenece a esa ruta
 */
const trackRef = z.string().nullable().optional();

export const trackSchema = z.object({
  slug,
  title: z.string().min(1),
  emoji: z.string().optional(),
  description: z.string().optional(),
  /** Paleta que se aplica al activar la ruta; el usuario puede sobrescribirla en Ajustes. */
  palette: z.enum(["ctos", "neon", "dedsec", "fsociety", "frostpunk", "cyberpunk", "animus"]).optional(),
  /** Interfaz por defecto: "hud" (mapa de hexágonos) o "terminal" (mapa como escaneo nmap). */
  ui: z.enum(["hud", "terminal"]).optional(),
  order: z.number().int().positive(),
  status,
});
export const tracksFileSchema = z.object({ tracks: z.array(trackSchema).min(1) });

export const skillSchema = z.object({
  code: z.string().regex(/^[a-z_]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  core: z.boolean().default(false),
  target_xp: z.number().int().positive(),
  track: trackRef,
});
export const skillsFileSchema = z.object({ skills: z.array(skillSchema).min(1) });

export const resourceSchema = z
  .object({
    slug,
    title: z.string().min(1),
    type: z.enum(["docs", "video", "course", "book", "channel", "article", "lab"]),
    url: z.string().url().nullable(),
    how_to_find: z.string().optional(),
    language: z.enum(["es", "en"]),
    duration_min: z.number().int().nonnegative().optional(),
    cost: z.enum(["free", "paid", "included"]),
    required: z.boolean().default(false),
    why: z.string().optional(),
    verified: z.boolean().default(false),
  })
  .refine((r) => r.url !== null || !!r.how_to_find, {
    message: "Si url es null, how_to_find es obligatorio",
  })
  .refine((r) => !(r.url === null && r.verified), {
    message: "Un recurso sin url no puede estar verified: true",
  });
export const resourcesFileSchema = z.object({ resources: z.array(resourceSchema) });

export const quizQuestionSchema = z.object({
  slug: slug.optional(),
  type: z.enum(["mcq", "tf", "order", "fill"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.union([z.number(), z.boolean(), z.string(), z.array(z.union([z.number(), z.string()]))]),
  explanation: z.string().min(1),
  skill: z.string(),
  difficulty: z.number().int().min(1).max(3),
  hint: z.string().optional(),
});

const resourceRef = z.object({ ref: slug, required: z.boolean().default(true) });

export const questSchema = z.object({
  slug,
  type: z.enum(questTypes),
  title: z.string().min(1),
  required: z.boolean().default(true),
  estimated_min: z.number().int().positive().optional(),
  xp: z.number().int().nonnegative().optional(),
  status,
  skills: z.record(z.string(), z.number().positive().max(1)).default({}),
  resources: z.array(resourceRef).default([]),
  questions: z.array(quizQuestionSchema).default([]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const levelSchema = z.object({
  slug,
  number: z.number().int().min(1).max(5),
  title: z.string().min(1),
  story: z.string().optional(),
  status,
  quests: z.array(questSchema).default([]),
});

export const zoneSchema = z.object({
  slug,
  title: z.string().min(1),
  order: z.number().int().positive(),
  emoji: z.string().optional(),
  story: z.string().optional(),
  status,
  unlocked_from_start: z.boolean().default(false),
  /** Posición del nodo en el mapa (viewBox 1000 × 640). */
  map: z.object({ x: z.number().min(0).max(1000), y: z.number().min(0).max(640) }).optional(),
  prerequisites: z.array(z.object({ zone: slug, level: z.number().int().min(1).max(5) })).default([]),
  skills: z.array(z.string()).default([]),
  track: trackRef,
  levels: z.array(levelSchema).max(5),
});

export const glossaryTermSchema = z.object({
  slug,
  term: z.string().min(1),
  category: z.string().optional(),
  definition_es: z.string().min(1),
  definition_en: z.string().min(1),
  example_en: z.string().optional(),
  analogy: z.string().optional(),
  analogy_mq: z.string().optional(),
  see_also: z.array(z.string()).default([]),
});
export const glossaryFileSchema = z.object({
  zone: slug.optional(),
  terms: z.array(glossaryTermSchema),
});

export const interviewTemplateSchema = z.object({
  slug,
  mode: z.enum(["behavioral", "technical_screen", "system_design", "coding_task", "mock_loop"]),
  title: z.string().min(1),
  zone: slug.optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export const interviewsFileSchema = z.object({ templates: z.array(interviewTemplateSchema) });

export type TrackInput = z.infer<typeof trackSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
export type ZoneInput = z.infer<typeof zoneSchema>;
export type LevelInput = z.infer<typeof levelSchema>;
export type QuestInput = z.infer<typeof questSchema>;
export type GlossaryFile = z.infer<typeof glossaryFileSchema>;
export type InterviewsFile = z.infer<typeof interviewsFileSchema>;
