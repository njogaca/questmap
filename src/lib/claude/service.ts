import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { awardFirstInterviewBadge, completeQuest, getQuestBySlug, logStudy, type Reward } from "../game";
import { shuffle } from "../quiz";
import { callClaude } from "./client";
import { extractGrading, isPassing, stripJson, type Grading } from "./grading";
import {
  gradingPrompt,
  interviewEvaluationPrompt,
  interviewerSystemPrompt,
  interviewScriptPrompt,
  transcriptText,
  type InterviewContext,
  type InterviewMode,
} from "./prompts";

const NOT_FOUND_JSON =
  "No encontré el bloque JSON de calificación en lo que pegaste. Copia la respuesta COMPLETA de Claude (incluido el bloque ```json del final).";

export type ApplyResult =
  | { ok: true; grading: Grading; passed: boolean; reward?: Reward }
  | { ok: false; error: string; needsEvaluation?: string };

async function queueGaps(gaps: string[], source: string) {
  const clean = [...new Set(gaps.map((g) => g.trim()).filter(Boolean))].slice(0, 5);
  if (!clean.length) return;
  const open = await db.select().from(s.reviewQueue).where(isNull(s.reviewQueue.doneAt));
  const existing = new Set(open.map((o) => o.topic.toLowerCase()));
  const fresh = clean.filter((g) => !existing.has(g.toLowerCase()));
  if (fresh.length) await db.insert(s.reviewQueue).values(fresh.map((topic) => ({ topic, source })));
}

/* ============================================================ evaluaciones */

export async function startEvaluation(kind: "open_answer" | "lab_review", questSlug: string, answer: string) {
  const clean = answer.trim();
  if (clean.length < 20) throw new Error("Escribe tu respuesta (mínimo 20 caracteres).");
  const { world, quest } = await getQuestBySlug(questSlug);
  if (quest.state === "locked") throw new Error("Esta quest está bloqueada.");
  const level = world.levels.find((l) => l.id === quest.levelId)!;
  const zone = world.zones.find((z) => z.id === level.zoneId)!;
  const p = quest.payload as Record<string, unknown>;

  const question =
    kind === "lab_review"
      ? [
          `Lab: ${quest.title}`,
          p.goal ? `Goal: ${p.goal}` : "",
          p.expected ? `Expected result: ${p.expected}` : "",
          Array.isArray(p.checklist) ? `Checklist:\n- ${(p.checklist as string[]).join("\n- ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : String(p.prompt_en ?? quest.title);

  const prompt = gradingPrompt({ kind, questTitle: quest.title, zoneTitle: zone.title, question, answer: clean });
  const [row] = await db
    .insert(s.evaluations)
    .values({ questId: quest.id, kind, answer: clean, prompt })
    .returning({ id: s.evaluations.id });
  return { id: row.id, prompt };
}

export async function applyEvaluation(id: number, raw: string, source: "api" | "manual", tokens = 0): Promise<ApplyResult> {
  const [ev] = await db.select().from(s.evaluations).where(eq(s.evaluations.id, id));
  if (!ev) return { ok: false, error: "Evaluación no encontrada." };
  const grading = extractGrading(raw);
  if (!grading) return { ok: false, error: NOT_FOUND_JSON };

  await db
    .update(s.evaluations)
    .set({ rawResponse: raw, score: grading.score, rubric: grading, modeSource: source, apiTokens: ev.apiTokens + tokens })
    .where(eq(s.evaluations.id, id));
  await queueGaps(grading.gaps, `evaluation:${id}`);

  const passed = isPassing(grading);
  let reward: Reward | undefined;
  if (ev.kind === "open_answer" && passed && ev.questId) {
    const [q] = await db.select({ slug: s.quests.slug }).from(s.quests).where(eq(s.quests.id, ev.questId));
    if (q) reward = await completeQuest(q.slug);
  }
  return { ok: true, grading, passed, reward };
}

export async function runEvaluationApi(id: number): Promise<ApplyResult> {
  const [ev] = await db.select().from(s.evaluations).where(eq(s.evaluations.id, id));
  if (!ev) return { ok: false, error: "Evaluación no encontrada." };
  const r = await callClaude({ messages: [{ role: "user", content: ev.prompt }], effort: "high" });
  if (!r.ok) return { ok: false, error: r.error };
  return applyEvaluation(id, r.text, "api", r.tokens);
}

/* ============================================================ entrevistas */

async function templateBySlug(slug: string) {
  const [t] = await db.select().from(s.interviewTemplates).where(eq(s.interviewTemplates.slug, slug));
  return t;
}

function contextFromTemplate(t: typeof s.interviewTemplates.$inferSelect): InterviewContext {
  const p = t.payload as { questions?: string[]; pick?: number; statement?: string; focus?: string[]; duration_min?: number };
  const questions = p.questions ? shuffle(p.questions).slice(0, p.pick ?? p.questions.length) : undefined;
  return {
    mode: t.mode as InterviewMode,
    title: t.title,
    questions,
    statement: p.statement,
    focus: p.focus,
    durationMin: p.duration_min,
  };
}

async function mockLoopContext(): Promise<InterviewContext> {
  const all = await db.select().from(s.interviewTemplates).where(eq(s.interviewTemplates.status, "published"));
  const tech = all.filter((t) => t.mode === "technical_screen");
  const beh = all.find((t) => t.mode === "behavioral");
  const design = shuffle(all.filter((t) => t.mode === "system_design"))[0];
  const techQs = tech.flatMap((t) => shuffle(((t.payload as { questions?: string[] }).questions ?? [])).slice(0, 1));
  const behQs = shuffle(((beh?.payload as { questions?: string[] })?.questions ?? [])).slice(0, 2);
  return {
    mode: "mock_loop",
    title: "Full mock loop",
    questions: [
      ...techQs.map((q) => `[Technical] ${q}`),
      ...behQs.map((q) => `[Behavioral] ${q}`),
      design ? `[System design, ~15 min] ${(design.payload as { statement?: string }).statement}` : "",
    ].filter(Boolean),
    durationMin: 60,
  };
}

export async function startInterview(input: {
  mode?: InterviewMode;
  templateSlug?: string;
  questSlug?: string;
  deliverable?: string;
}): Promise<number> {
  let ctx: InterviewContext;
  let templateId: number | null = null;
  let questId: number | null = null;

  if (input.questSlug) {
    const { world, quest } = await getQuestBySlug(input.questSlug);
    if (quest.state === "locked") throw new Error("Esta quest está bloqueada.");
    questId = quest.id;
    const level = world.levels.find((l) => l.id === quest.levelId)!;
    const zone = world.zones.find((z) => z.id === level.zoneId)!;
    const p = quest.payload as { task?: string; interview_focus?: string[]; mode?: string; zone?: string };
    if (quest.type === "boss") {
      const deliverable = input.deliverable?.trim() ?? "";
      if (deliverable.length < 20) throw new Error("Pega tu entregable: URL del repo, diseño o texto (mínimo 20 caracteres).");
      ctx = {
        mode: "boss",
        title: quest.title,
        zoneTitle: zone.title,
        statement: p.task,
        deliverable,
        focus: p.interview_focus,
        durationMin: 45,
      };
    } else {
      // Plantilla por modo/zona: technical-<zona> (java, eda, cassandra…). Si la zona aún no tiene
      // plantilla, el entrevistador improvisa sobre los temas de la zona.
      const mode = (p.mode ?? "technical_screen") as InterviewMode;
      const zoneKey: Record<string, string> = { "java-forest": "java", "event-harbor": "eda", "cassandra-caverns": "cassandra" };
      const zoneForTemplate = p.zone ?? zone.slug;
      const all = await db.select().from(s.interviewTemplates).where(eq(s.interviewTemplates.status, "published"));
      const t =
        mode === "technical_screen"
          ? all.find((x) => x.slug === `technical-${zoneKey[zoneForTemplate] ?? zoneForTemplate}`)
          : shuffle(all.filter((x) => x.mode === mode))[0];
      if (t) {
        templateId = t.id;
        ctx = { ...contextFromTemplate(t), zoneTitle: zone.title };
      } else {
        ctx = {
          mode,
          title: `${quest.title}`,
          zoneTitle: zone.title,
          focus: [level.title, ...zone.skills],
          durationMin: 30,
          questions: [],
        };
      }
    }
  } else if (input.mode === "mock_loop") {
    ctx = await mockLoopContext();
  } else if (input.templateSlug) {
    const t = await templateBySlug(input.templateSlug);
    if (!t) throw new Error("Plantilla no encontrada.");
    templateId = t.id;
    ctx = contextFromTemplate(t);
    if (input.deliverable?.trim()) ctx.deliverable = input.deliverable.trim();
  } else {
    throw new Error("Falta el tipo de entrevista.");
  }

  const [row] = await db
    .insert(s.interviewSessions)
    .values({
      templateId,
      questId,
      mode: ctx.mode,
      context: ctx as unknown as Record<string, unknown>,
      prompt: interviewScriptPrompt(ctx),
    })
    .returning({ id: s.interviewSessions.id });
  return row.id;
}

async function loadSession(id: number) {
  const [session] = await db.select().from(s.interviewSessions).where(eq(s.interviewSessions.id, id));
  if (!session) throw new Error("Sesión no encontrada.");
  const turns = await db
    .select()
    .from(s.interviewTurns)
    .where(eq(s.interviewTurns.sessionId, id))
    .orderBy(asc(s.interviewTurns.id));
  return { session, turns, ctx: session.context as unknown as InterviewContext };
}

/** Modo B: guarda la respuesta del candidato (si hay) y pide el siguiente turno al entrevistador. */
export async function interviewTurnApi(sessionId: number, answer?: string) {
  const { session, turns, ctx } = await loadSession(sessionId);
  if (session.finishedAt) throw new Error("Esta sesión ya terminó.");
  const text = answer?.trim();
  if (turns.length === 0) {
    await db.insert(s.interviewTurns).values({ sessionId, role: "user", content: "Hi! I'm ready to start the interview." });
  } else if (text) {
    // Se guarda ANTES de llamar a la API: si falla, la respuesta no se pierde.
    await db.insert(s.interviewTurns).values({ sessionId, role: "user", content: text });
  } else if (turns.filter((t) => t.role === "user" || t.role === "assistant").at(-1)?.role !== "user") {
    // Sin texto nuevo solo se permite reintentar cuando la última respuesta quedó sin contestar.
    throw new Error("Escribe tu respuesta.");
  }

  const all = (await loadSession(sessionId)).turns.filter((t) => t.role === "user" || t.role === "assistant");
  const r = await callClaude({
    system: interviewerSystemPrompt(ctx),
    messages: all.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
    effort: "medium",
    maxTokens: 4000,
  });
  if (!r.ok) return { ok: false as const, error: r.error };
  await db.insert(s.interviewTurns).values({ sessionId, role: "assistant", content: r.text });
  await db
    .update(s.interviewSessions)
    .set({ apiTokens: session.apiTokens + r.tokens, modeSource: "api" })
    .where(eq(s.interviewSessions.id, sessionId));
  return { ok: true as const };
}

async function applyInterview(sessionId: number, grading: Grading, raw: string, source: "api" | "manual"): Promise<ApplyResult> {
  const { session } = await loadSession(sessionId);
  const finishedAt = new Date();
  await db
    .update(s.interviewSessions)
    .set({
      finishedAt,
      score: grading.score,
      rubric: grading,
      feedbackMd: stripJson(raw),
      modeSource: source,
    })
    .where(eq(s.interviewSessions.id, sessionId));
  await queueGaps(grading.gaps, `interview:${sessionId}`);

  const minutes = Math.min(90, Math.max(5, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 60_000)));
  const badges = await logStudy(minutes, `interview:${session.mode}`, session.questId);

  const passed = isPassing(grading);
  let reward: Reward | undefined;
  if (passed) {
    if (session.questId) {
      const [q] = await db.select({ slug: s.quests.slug }).from(s.quests).where(eq(s.quests.id, session.questId));
      if (q) reward = await completeQuest(q.slug, { logMinutes: false });
    }
    const b = await awardFirstInterviewBadge();
    if (b) (reward ??= { xp: 0, messages: [], badges: [], rankUp: null }).badges.push(b);
  }
  if (badges.length) (reward ??= { xp: 0, messages: [], badges: [], rankUp: null }).badges.push(...badges);
  return { ok: true, grading, passed, reward };
}

/** Modo B: termina la entrevista y pide la calificación. */
export async function finishInterviewApi(sessionId: number): Promise<ApplyResult> {
  const { turns, ctx, session } = await loadSession(sessionId);
  const dialog = turns.filter((t) => t.role === "user" || t.role === "assistant");
  if (dialog.length < 3) return { ok: false, error: "Responde al menos una pregunta antes de terminar." };
  const prompt = interviewEvaluationPrompt(ctx, transcriptText(dialog.slice(1)));
  const r = await callClaude({ messages: [{ role: "user", content: prompt }], effort: "high" });
  if (!r.ok) return { ok: false, error: r.error, needsEvaluation: prompt };
  await db
    .update(s.interviewSessions)
    .set({ apiTokens: session.apiTokens + r.tokens })
    .where(eq(s.interviewSessions.id, sessionId));
  const grading = extractGrading(r.text);
  if (!grading) return { ok: false, error: "Claude no devolvió el JSON de calificación. Prueba con el Modo A.", needsEvaluation: prompt };
  return applyInterview(sessionId, grading, r.text, "api");
}

/**
 * Modo A: el usuario pega lo que respondió Claude en claude.ai.
 * Si trae el JSON → se califica. Si no → se guarda como transcripción y se devuelve el prompt de evaluación.
 */
export async function submitInterviewManual(sessionId: number, pasted: string): Promise<ApplyResult> {
  const text = pasted.trim();
  if (text.length < 20) return { ok: false, error: "Pega la respuesta o la transcripción completa." };
  const { ctx, turns } = await loadSession(sessionId);
  const grading = extractGrading(text);
  if (grading) {
    await db.insert(s.interviewTurns).values({ sessionId, role: "evaluation", content: text });
    return applyInterview(sessionId, grading, text, "manual");
  }
  await db.insert(s.interviewTurns).values({ sessionId, role: "transcript", content: text });
  const dialog = turns.filter((t) => t.role === "user" || t.role === "assistant");
  const transcript = dialog.length > 1 ? `${transcriptText(dialog.slice(1))}\n\n${text}` : text;
  return { ok: false, error: NOT_FOUND_JSON, needsEvaluation: interviewEvaluationPrompt(ctx, transcript) };
}

export async function evaluationPromptForSession(sessionId: number) {
  const { ctx, turns } = await loadSession(sessionId);
  const dialog = turns.filter((t) => t.role === "user" || t.role === "assistant");
  return interviewEvaluationPrompt(ctx, transcriptText(dialog.slice(1)));
}

/* =============================================================== refuerzos */

export async function openReviewItems(limit = 5) {
  return db
    .select()
    .from(s.reviewQueue)
    .where(isNull(s.reviewQueue.doneAt))
    .orderBy(asc(s.reviewQueue.createdAt))
    .limit(limit);
}

export async function completeReviewItem(id: number, minutes: number) {
  await db.update(s.reviewQueue).set({ doneAt: new Date() }).where(and(eq(s.reviewQueue.id, id), isNull(s.reviewQueue.doneAt)));
  return logStudy(Math.max(1, Math.min(60, Math.round(minutes))), `review:${id}`);
}
