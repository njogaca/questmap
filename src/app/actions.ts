"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db/client";
import {
  assertUnlocked,
  awardPerfectQuizBadge,
  completeQuest,
  getQuestBySlug,
  grantDailyReview,
  logStudy,
  markInProgress,
  type Reward,
} from "@/lib/game";
import { gradeAnswer, QUIZ_PASS_PERCENT, scorePercent, type QuizQuestionPayload } from "@/lib/quiz";
import { GLOSSARY_PASS_PERCENT, LEARN_NOTE_MIN_CHARS } from "@/lib/rules";
import { reviewCard, SRS_NEW, type SrsGrade } from "@/lib/srs";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

function refresh() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ learn */

export async function setResourceSeen(questSlug: string, resourceId: number, seen: boolean): Promise<ActionResult> {
  try {
    const { quest } = await getQuestBySlug(questSlug);
    assertUnlocked(quest.state);
    await db
      .insert(s.resourceProgress)
      .values({ resourceId, seen })
      .onConflictDoUpdate({ target: s.resourceProgress.resourceId, set: { seen } });
    if (quest.state !== "completed") await markInProgress(quest.id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeLearn(questSlug: string, note: string): Promise<ActionResult<{ reward: Reward }>> {
  try {
    const { quest } = await getQuestBySlug(questSlug);
    assertUnlocked(quest.state);
    const clean = note.trim();
    if (clean.length < LEARN_NOTE_MIN_CHARS)
      throw new Error(`Escribe tu nota con tus palabras (mínimo ${LEARN_NOTE_MIN_CHARS} caracteres, unas 2–3 líneas).`);

    const required = await db
      .select({ id: s.questResources.resourceId })
      .from(s.questResources)
      .where(and(eq(s.questResources.questId, quest.id), eq(s.questResources.required, true)));
    if (required.length) {
      const seen = await db
        .select({ id: s.resourceProgress.resourceId })
        .from(s.resourceProgress)
        .where(and(inArray(s.resourceProgress.resourceId, required.map((r) => r.id)), eq(s.resourceProgress.seen, true)));
      if (seen.length < required.length) throw new Error("Marca como vistos todos los recursos obligatorios.");
    }
    const reward = await completeQuest(questSlug, { notes: clean });
    refresh();
    return { ok: true, reward };
  } catch (e) {
    return fail(e);
  }
}

export async function addCustomResource(input: {
  title: string;
  url?: string;
  type: string;
  language: string;
  durationMin?: number;
  questSlug?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const title = input.title.trim();
    if (!title) throw new Error("Ponle un título al recurso.");
    const url = input.url?.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) throw new Error("La URL debe empezar con http:// o https://");
    await db.insert(s.customResources).values({
      title,
      url,
      type: input.type || "article",
      language: input.language || "es",
      durationMin: input.durationMin || null,
      cost: "included",
      notes: input.notes?.trim() || null,
      questSlug: input.questSlug || null,
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------------------------------------------- glosario */

export async function reviewTerm(termId: number, grade: SrsGrade): Promise<ActionResult<{ dueAt: string }>> {
  try {
    const [row] = await db.select().from(s.glossarySrs).where(eq(s.glossarySrs.termId, termId));
    const next = reviewCard(row ?? SRS_NEW, grade);
    const values = {
      termId,
      ease: next.ease,
      intervalDays: next.intervalDays,
      reps: next.reps,
      lapses: next.lapses,
      dueAt: next.dueAt,
    };
    await db.insert(s.glossarySrs).values(values).onConflictDoUpdate({ target: s.glossarySrs.termId, set: values });
    return { ok: true, dueAt: next.dueAt.toISOString() };
  } catch (e) {
    return fail(e);
  }
}

/** Fin de una sesión de repaso libre / diario (no ligada a una quest). */
export async function finishReviewSession(cardsReviewed: number): Promise<ActionResult<{ reward: Reward }>> {
  try {
    const reward = await grantDailyReview(cardsReviewed);
    refresh();
    return { ok: true, reward };
  } catch (e) {
    return fail(e);
  }
}

/** Quest `glossary`: pasa el mini-repaso si ≥ 80 % de las tarjetas fueron good/easy. */
export async function finishGlossaryQuest(
  questSlug: string,
  grades: SrsGrade[],
): Promise<ActionResult<{ passed: boolean; percent: number; reward?: Reward }>> {
  try {
    const { quest } = await getQuestBySlug(questSlug);
    assertUnlocked(quest.state);
    const good = grades.filter((g) => g === "good" || g === "easy").length;
    const percent = scorePercent(good, grades.length);
    if (percent < GLOSSARY_PASS_PERCENT) {
      await markInProgress(quest.id);
      await logStudy(Math.max(1, Math.round(grades.length * 0.5)), `glossary:${quest.slug}`, quest.id);
      refresh();
      return { ok: true, passed: false, percent };
    }
    const reward = await completeQuest(questSlug);
    refresh();
    return { ok: true, passed: true, percent, reward };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------------------------------------------- quiz */

async function loadQuestion(questionId: number) {
  const [q] = await db.select().from(s.quizQuestions).where(eq(s.quizQuestions.id, questionId));
  if (!q) throw new Error("Pregunta no encontrada");
  return { ...q, p: q.payload as unknown as QuizQuestionPayload };
}

export async function checkQuizAnswer(
  questionId: number,
  answer: unknown,
): Promise<ActionResult<{ correct: boolean; explanation: string; correctAnswer: QuizQuestionPayload["answer"] }>> {
  try {
    const q = await loadQuestion(questionId);
    return { ok: true, correct: gradeAnswer(q.type, q.p, answer), explanation: q.p.explanation, correctAnswer: q.p.answer };
  } catch (e) {
    return fail(e);
  }
}

export async function submitQuiz(input: {
  questSlug: string;
  answers: { questionId: number; answer: unknown }[];
  hintsUsed: number;
  startedAt: string;
}): Promise<ActionResult<{ score: number; passed: boolean; reward?: Reward }>> {
  try {
    const { quest } = await getQuestBySlug(input.questSlug);
    assertUnlocked(quest.state);
    const questions = await db
      .select()
      .from(s.quizQuestions)
      .where(and(eq(s.quizQuestions.questId, quest.id), eq(s.quizQuestions.status, "published")));
    if (!questions.length) throw new Error("Este quiz no tiene preguntas.");

    const byId = new Map(questions.map((q) => [q.id, q]));
    const graded = questions.map((q) => {
      const given = input.answers.find((a) => a.questionId === q.id)?.answer ?? null;
      return { q, given, correct: gradeAnswer(q.type, q.payload as unknown as QuizQuestionPayload, given) };
    });
    const score = scorePercent(graded.filter((g) => g.correct).length, questions.length);
    const passed = score >= QUIZ_PASS_PERCENT;
    const startedAt = new Date(input.startedAt);
    const finishedAt = new Date();

    await db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(s.quizAttempts)
        .values({ questId: quest.id, score, passed, startedAt, finishedAt })
        .returning({ id: s.quizAttempts.id });
      for (const g of graded) {
        if (!byId.has(g.q.id)) continue;
        await tx.insert(s.quizAnswers).values({ attemptId: attempt.id, questionId: g.q.id, answer: g.given, correct: g.correct });
      }
      await tx
        .insert(s.questProgress)
        .values({ questId: quest.id, status: "in_progress", hintsUsed: input.hintsUsed })
        .onConflictDoNothing();
    });

    // Minutos reales del intento (acotados) — cada intento es tiempo de estudio.
    const elapsedMin = Math.min(quest.estimatedMin * 2, Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60_000)));
    await logStudy(elapsedMin, `quiz:${quest.slug}`, quest.id);

    let reward: Reward | undefined;
    if (passed && quest.state !== "completed") {
      reward = await completeQuest(input.questSlug, { hintsUsed: input.hintsUsed, quizScore: score, logMinutes: false });
    }
    if (score === 100) {
      const b = await awardPerfectQuizBadge();
      if (b) (reward ??= { xp: 0, messages: [], badges: [], rankUp: null }).badges.push(b);
    }
    refresh();
    return { ok: true, score, passed, reward };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------- micro */

export async function completeMicro(questSlug: string, text?: string): Promise<ActionResult<{ reward: Reward }>> {
  try {
    const { quest } = await getQuestBySlug(questSlug);
    assertUnlocked(quest.state);
    const kind = String(quest.payload.kind ?? "flashcards");
    if ((kind === "speaking" || kind === "writing") && (text?.trim().length ?? 0) < 20)
      throw new Error("Pega tu transcripción o tu frase (mínimo 20 caracteres).");
    const reward = await completeQuest(questSlug, { evidence: text?.trim() || undefined });
    refresh();
    return { ok: true, reward };
  } catch (e) {
    return fail(e);
  }
}

/* ----------------------------------------------------------------- minutos */

export async function addManualMinutes(minutes: number, activity: string): Promise<ActionResult<{ badges: string[] }>> {
  try {
    const m = Math.round(Number(minutes));
    if (!Number.isFinite(m) || m < 1 || m > 600) throw new Error("Ingresa entre 1 y 600 minutos.");
    const badges = await logStudy(m, `manual:${activity.trim() || "estudio"}`);
    refresh();
    return { ok: true, badges };
  } catch (e) {
    return fail(e);
  }
}
