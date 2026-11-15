import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* =====================================================================
 * CONTENIDO — lo escribe el seed (upsert por slug). Nunca contiene progreso.
 * ===================================================================== */

export const contentStatus = pgEnum("content_status", ["published", "outline", "archived"]);
export const questType = pgEnum("quest_type", [
  "learn",
  "glossary",
  "lab",
  "quiz",
  "open_answer",
  "interview",
  "boss",
  "micro",
]);

/**
 * Una ruta de estudio: un mundo propio (sus zonas, sus skills, su XP y su readiness).
 * `palette` es el id de paleta que se aplica al activarla; el usuario puede sobrescribirla en Ajustes.
 */
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  emoji: text("emoji"),
  description: text("description"),
  /** OBSOLETA: la paleta la trae la interfaz (`ui`). Se deja la columna por no migrar en vano. */
  palette: text("palette"),
  /** Interfaz por defecto de la ruta: "hud" (hexágonos) o "terminal" (escaneo nmap). */
  ui: text("ui"),
  order: integer("order").notNull().default(0),
  status: contentStatus("status").notNull().default("published"),
});

/**
 * REGLA DE RUTAS, válida para toda la base: `track_id` NULL significa TRANSVERSAL,
 * es decir que la fila vale para todas las rutas (inglés, entrevistas, Linux).
 * Se modela con NULL y no con un booleano `shared` para que no exista el estado
 * contradictorio "compartida pero además pertenece a la ruta 5".
 */
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  core: boolean("core").notNull().default(false),
  targetXp: integer("target_xp").notNull(),
  order: integer("order").notNull().default(0),
  trackId: integer("track_id").references(() => tracks.id),
  status: contentStatus("status").notNull().default("published"),
});

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  emoji: text("emoji"),
  story: text("story"),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  unlockedFromStart: boolean("unlocked_from_start").notNull().default(false),
  mapX: integer("map_x"),
  mapY: integer("map_y"),
  /** NULL = zona transversal: aparece en el mapa de todas las rutas. Ver la regla en `skills`. */
  trackId: integer("track_id").references(() => tracks.id),
  status: contentStatus("status").notNull().default("published"),
});

/** La zona `zoneId` requiere haber completado `requiresLevelNumber` de `requiresZoneId`. */
export const zonePrerequisites = pgTable(
  "zone_prerequisites",
  {
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    requiresZoneId: integer("requires_zone_id")
      .notNull()
      .references(() => zones.id),
    requiresLevelNumber: integer("requires_level_number").notNull(),
  },
  (t) => [primaryKey({ columns: [t.zoneId, t.requiresZoneId] })],
);

export const levels = pgTable(
  "levels",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    story: text("story"),
    status: contentStatus("status").notNull().default("published"),
  },
  (t) => [index("levels_zone_idx").on(t.zoneId)],
);

export const quests = pgTable(
  "quests",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    levelId: integer("level_id")
      .notNull()
      .references(() => levels.id),
    type: questType("type").notNull(),
    title: text("title").notNull(),
    order: integer("order").notNull(),
    required: boolean("required").notNull().default(true),
    xp: integer("xp").notNull(),
    estimatedMin: integer("estimated_min").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: contentStatus("status").notNull().default("published"),
  },
  (t) => [index("quests_level_idx").on(t.levelId)],
);

export const questSkills = pgTable(
  "quest_skills",
  {
    questId: integer("quest_id")
      .notNull()
      .references(() => quests.id),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id),
    weight: doublePrecision("weight").notNull(),
  },
  (t) => [primaryKey({ columns: [t.questId, t.skillId] })],
);

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  url: text("url"),
  howToFind: text("how_to_find"),
  language: text("language").notNull(),
  durationMin: integer("duration_min"),
  cost: text("cost").notNull(),
  required: boolean("required").notNull().default(false),
  why: text("why"),
  verified: boolean("verified").notNull().default(false),
  status: contentStatus("status").notNull().default("published"),
});

export const questResources = pgTable(
  "quest_resources",
  {
    questId: integer("quest_id")
      .notNull()
      .references(() => quests.id),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id),
    required: boolean("required").notNull().default(true),
    order: integer("order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.questId, t.resourceId] })],
);

export const glossaryTerms = pgTable("glossary_terms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  term: text("term").notNull(),
  zoneSlug: text("zone_slug"),
  category: text("category"),
  definitionEs: text("definition_es").notNull(),
  definitionEn: text("definition_en").notNull(),
  exampleEn: text("example_en"),
  /** Analogía cotidiana (o de cualquier tipo) para entender el término. */
  analogy: text("analogy"),
  /** Opcional y poco frecuente: equivalente en IBM MQ/IIB/DataPower cuando realmente ayuda. */
  analogyMq: text("analogy_mq"),
  seeAlso: jsonb("see_also").$type<string[]>().notNull().default([]),
  status: contentStatus("status").notNull().default("published"),
});

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    questId: integer("quest_id")
      .notNull()
      .references(() => quests.id),
    type: text("type").notNull(),
    order: integer("order").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: contentStatus("status").notNull().default("published"),
  },
  (t) => [index("quiz_questions_quest_idx").on(t.questId)],
);

export const interviewTemplates = pgTable("interview_templates", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  mode: text("mode").notNull(),
  title: text("title").notNull(),
  zoneSlug: text("zone_slug"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: contentStatus("status").notNull().default("published"),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  status: contentStatus("status").notNull().default("published"),
});

/* =====================================================================
 * PROGRESO — el seed NUNCA borra ni modifica estas tablas.
 * ===================================================================== */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const questProgressStatus = pgEnum("quest_progress_status", [
  "locked",
  "available",
  "in_progress",
  "completed",
]);

/** Una sola fila (id = 1). La racha se deriva de study_log; aquí solo hay caché. */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
  /** XP acumulado de por vida, sumando todas las rutas. El XP por ruta vive en `track_progress`. */
  xpTotal: integer("xp_total").notNull().default(0),
  streakCurrentCache: integer("streak_current_cache").notNull().default(0),
  streakBestCache: integer("streak_best_cache").notNull().default(0),
  /** Ruta que estoy cursando hoy. La racha NO se parte por ruta: estudiaste ese día y punto. */
  activeTrackId: integer("active_track_id").references(() => tracks.id),
  ...timestamps,
});

/** Puntuaciones por ruta: cada ruta lleva su propio XP y su propio rango. */
export const trackProgress = pgTable("track_progress", {
  trackId: integer("track_id")
    .primaryKey()
    .references(() => tracks.id),
  xpTotal: integer("xp_total").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  ...timestamps,
});

export const questProgress = pgTable(
  "quest_progress",
  {
    questId: integer("quest_id")
      .primaryKey()
      .references(() => quests.id),
    status: questProgressStatus("status").notNull().default("available"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    notes: text("notes"),
    evidence: text("evidence"),
    ...timestamps,
  },
);

export const resourceProgress = pgTable("resource_progress", {
  resourceId: integer("resource_id")
    .primaryKey()
    .references(() => resources.id),
  seen: boolean("seen").notNull().default(false),
  note: text("note"),
  ...timestamps,
});

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    questId: integer("quest_id")
      .notNull()
      .references(() => quests.id),
    score: integer("score"),
    passed: boolean("passed").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("quiz_attempts_quest_idx").on(t.questId)],
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => quizAttempts.id),
    questionId: integer("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    answer: jsonb("answer"),
    correct: boolean("correct").notNull(),
    ...timestamps,
  },
  (t) => [index("quiz_answers_attempt_idx").on(t.attemptId)],
);

export const glossarySrs = pgTable(
  "glossary_srs",
  {
    termId: integer("term_id")
      .primaryKey()
      .references(() => glossaryTerms.id),
    ease: doublePrecision("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("glossary_srs_due_idx").on(t.dueAt)],
);

export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => interviewTemplates.id),
  questId: integer("quest_id").references(() => quests.id),
  mode: text("mode").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  score: integer("score"),
  rubric: jsonb("rubric"),
  feedbackMd: text("feedback_md"),
  modeSource: text("mode_source").notNull().default("manual"), // api | manual
  /** Plan de la entrevista: preguntas, enunciado, entregable, foco (InterviewContext). */
  context: jsonb("context").$type<Record<string, unknown>>(),
  /** Prompt de Modo A generado para esta sesión. */
  prompt: text("prompt"),
  apiTokens: integer("api_tokens").notNull().default(0),
  ...timestamps,
});

/** Calificaciones de Claude para open_answer y revisión de evidencia de labs. */
export const evaluations = pgTable(
  "evaluations",
  {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => quests.id),
    kind: text("kind").notNull(), // open_answer | lab_review
    answer: text("answer").notNull(),
    prompt: text("prompt").notNull(),
    rawResponse: text("raw_response"),
    score: integer("score"),
    rubric: jsonb("rubric"),
    modeSource: text("mode_source"), // api | manual
    apiTokens: integer("api_tokens").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("evaluations_quest_idx").on(t.questId)],
);

/** Cola de refuerzo: los `gaps` de Claude se convierten en micro-tareas del día. */
export const reviewQueue = pgTable(
  "review_queue",
  {
    id: serial("id").primaryKey(),
    topic: text("topic").notNull(),
    source: text("source").notNull(), // ej. "interview:12" o "evaluation:4"
    doneAt: timestamp("done_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("review_queue_done_idx").on(t.doneAt)],
);

export const interviewTurns = pgTable(
  "interview_turns",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => interviewSessions.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    ...timestamps,
  },
  (t) => [index("interview_turns_session_idx").on(t.sessionId)],
);

export const xpEvents = pgTable(
  "xp_events",
  {
    id: serial("id").primaryKey(),
    reason: text("reason").notNull(),
    amount: integer("amount").notNull(),
    questId: integer("quest_id").references(() => quests.id),
    /** NULL = XP transversal (repaso de glosario, inglés): no se atribuye a ninguna ruta. */
    trackId: integer("track_id").references(() => tracks.id),
    ...timestamps,
  },
  (t) => [index("xp_events_quest_idx").on(t.questId), index("xp_events_track_idx").on(t.trackId)],
);

export const userBadges = pgTable("user_badges", {
  badgeId: integer("badge_id")
    .primaryKey()
    .references(() => badges.id),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

/** `date` es la fecha local según TZ (no UTC). */
export const studyLog = pgTable(
  "study_log",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    minutes: integer("minutes").notNull(),
    activity: text("activity").notNull(),
    questId: integer("quest_id").references(() => quests.id),
    /** NULL = minutos transversales. La racha se deriva de `date`, así que NO depende de la ruta. */
    trackId: integer("track_id").references(() => tracks.id),
    ...timestamps,
  },
  (t) => [index("study_log_date_idx").on(t.date)],
);

export const customResources = pgTable("custom_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  url: text("url"),
  language: text("language").notNull().default("es"),
  durationMin: integer("duration_min"),
  cost: text("cost").notNull().default("included"),
  notes: text("notes"),
  questSlug: text("quest_slug"),
  zoneSlug: text("zone_slug"),
  ...timestamps,
});

export const apiUsage = pgTable(
  "api_usage",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    calls: integer("calls").notNull().default(0),
    tokensApprox: integer("tokens_approx").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("api_usage_date_idx").on(t.date)],
);
