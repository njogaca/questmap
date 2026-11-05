import "server-only";
import { eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db/client";

/**
 * Exportar / importar progreso como JSON (segunda red de seguridad, sección 4 del SPEC).
 * Las referencias al contenido se guardan por SLUG, no por id, para que el archivo sirva
 * aunque la base de datos se recree desde cero (los ids seriales podrían cambiar).
 */

export const EXPORT_VERSION = 1;

type Maps = {
  quest: Map<number, string>;
  questId: Map<string, number>;
  resource: Map<number, string>;
  resourceId: Map<string, number>;
  term: Map<number, string>;
  termId: Map<string, number>;
  question: Map<number, string>;
  questionId: Map<string, number>;
  template: Map<number, string>;
  templateId: Map<string, number>;
  badge: Map<number, string>;
  badgeId: Map<string, number>;
};

async function loadMaps(): Promise<Maps> {
  const [quests, resources, terms, questions, templates, badges] = await Promise.all([
    db.select({ id: s.quests.id, slug: s.quests.slug }).from(s.quests),
    db.select({ id: s.resources.id, slug: s.resources.slug }).from(s.resources),
    db.select({ id: s.glossaryTerms.id, slug: s.glossaryTerms.slug }).from(s.glossaryTerms),
    db.select({ id: s.quizQuestions.id, slug: s.quizQuestions.slug }).from(s.quizQuestions),
    db.select({ id: s.interviewTemplates.id, slug: s.interviewTemplates.slug }).from(s.interviewTemplates),
    db.select({ id: s.badges.id, slug: s.badges.slug }).from(s.badges),
  ]);
  const pair = (rows: { id: number; slug: string }[]) =>
    [new Map(rows.map((r) => [r.id, r.slug])), new Map(rows.map((r) => [r.slug, r.id]))] as const;
  const [quest, questId] = pair(quests);
  const [resource, resourceId] = pair(resources);
  const [term, termId] = pair(terms);
  const [question, questionId] = pair(questions);
  const [template, templateId] = pair(templates);
  const [badge, badgeId] = pair(badges);
  return { quest, questId, resource, resourceId, term, termId, question, questionId, template, templateId, badge, badgeId };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function exportProgress() {
  const m = await loadMaps();
  const q = (id: number | null) => (id == null ? null : (m.quest.get(id) ?? null));

  const [profile, qp, rp, attempts, answers, srs, sessions, turns, xp, badges, log, custom, usage, evals, reviews] =
    await Promise.all([
      db.select().from(s.profile),
      db.select().from(s.questProgress),
      db.select().from(s.resourceProgress),
      db.select().from(s.quizAttempts),
      db.select().from(s.quizAnswers),
      db.select().from(s.glossarySrs),
      db.select().from(s.interviewSessions),
      db.select().from(s.interviewTurns),
      db.select().from(s.xpEvents),
      db.select().from(s.userBadges),
      db.select().from(s.studyLog),
      db.select().from(s.customResources),
      db.select().from(s.apiUsage),
      db.select().from(s.evaluations),
      db.select().from(s.reviewQueue),
    ]);

  return {
    app: "questmap",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile[0] ? { xpTotal: profile[0].xpTotal } : { xpTotal: 0 },
    questProgress: qp
      .filter((r) => m.quest.has(r.questId))
      .map((r) => ({
        quest: m.quest.get(r.questId)!,
        status: r.status,
        completedAt: iso(r.completedAt),
        xpAwarded: r.xpAwarded,
        hintsUsed: r.hintsUsed,
        notes: r.notes,
        evidence: r.evidence,
      })),
    resourceProgress: rp
      .filter((r) => m.resource.has(r.resourceId))
      .map((r) => ({ resource: m.resource.get(r.resourceId)!, seen: r.seen, note: r.note })),
    quizAttempts: attempts
      .filter((a) => m.quest.has(a.questId))
      .map((a) => ({
        key: a.id,
        quest: m.quest.get(a.questId)!,
        score: a.score,
        passed: a.passed,
        startedAt: iso(a.startedAt),
        finishedAt: iso(a.finishedAt),
        answers: answers
          .filter((x) => x.attemptId === a.id && m.question.has(x.questionId))
          .map((x) => ({ question: m.question.get(x.questionId)!, answer: x.answer, correct: x.correct })),
      })),
    glossarySrs: srs
      .filter((r) => m.term.has(r.termId))
      .map((r) => ({
        term: m.term.get(r.termId)!,
        ease: r.ease,
        intervalDays: r.intervalDays,
        dueAt: iso(r.dueAt),
        reps: r.reps,
        lapses: r.lapses,
      })),
    interviewSessions: sessions.map((x) => ({
      key: x.id,
      template: x.templateId ? (m.template.get(x.templateId) ?? null) : null,
      quest: q(x.questId),
      mode: x.mode,
      startedAt: iso(x.startedAt),
      finishedAt: iso(x.finishedAt),
      score: x.score,
      rubric: x.rubric,
      feedbackMd: x.feedbackMd,
      modeSource: x.modeSource,
      context: x.context,
      prompt: x.prompt,
      apiTokens: x.apiTokens,
      turns: turns
        .filter((t) => t.sessionId === x.id)
        .map((t) => ({ role: t.role, content: t.content, createdAt: iso(t.createdAt) })),
    })),
    xpEvents: xp.map((e) => ({ reason: e.reason, amount: e.amount, quest: q(e.questId), createdAt: iso(e.createdAt) })),
    badges: badges.filter((b) => m.badge.has(b.badgeId)).map((b) => ({ badge: m.badge.get(b.badgeId)!, awardedAt: iso(b.awardedAt) })),
    studyLog: log.map((l) => ({ date: l.date, minutes: l.minutes, activity: l.activity, quest: q(l.questId) })),
    customResources: custom.map((c) => ({
      title: c.title,
      type: c.type,
      url: c.url,
      language: c.language,
      durationMin: c.durationMin,
      cost: c.cost,
      notes: c.notes,
      questSlug: c.questSlug,
      zoneSlug: c.zoneSlug,
    })),
    apiUsage: usage.map((u) => ({ date: u.date, calls: u.calls, tokensApprox: u.tokensApprox })),
    evaluations: evals.map((e) => ({
      quest: q(e.questId),
      kind: e.kind,
      answer: e.answer,
      prompt: e.prompt,
      rawResponse: e.rawResponse,
      score: e.score,
      rubric: e.rubric,
      modeSource: e.modeSource,
      apiTokens: e.apiTokens,
      createdAt: iso(e.createdAt),
    })),
    reviewQueue: reviews.map((r) => ({ topic: r.topic, source: r.source, doneAt: iso(r.doneAt), createdAt: iso(r.createdAt) })),
  };
}

export type ProgressExport = Awaited<ReturnType<typeof exportProgress>>;

const exportSchema = z.object({
  app: z.literal("questmap"),
  version: z.number().int().max(EXPORT_VERSION),
  exportedAt: z.string(),
  profile: z.object({ xpTotal: z.number() }).passthrough(),
  questProgress: z.array(z.any()),
  resourceProgress: z.array(z.any()),
  quizAttempts: z.array(z.any()),
  glossarySrs: z.array(z.any()),
  interviewSessions: z.array(z.any()),
  xpEvents: z.array(z.any()),
  badges: z.array(z.any()),
  studyLog: z.array(z.any()),
  customResources: z.array(z.any()),
  apiUsage: z.array(z.any()),
  evaluations: z.array(z.any()).default([]),
  reviewQueue: z.array(z.any()).default([]),
});

const d = (v: unknown) => (v ? new Date(String(v)) : null);

/** Tablas de progreso, en orden seguro para borrar (hijas primero). */
const PROGRESS_TABLES_DELETE_ORDER = [
  "quiz_answers",
  "quiz_attempts",
  "interview_turns",
  "interview_sessions",
  "evaluations",
  "review_queue",
  "quest_progress",
  "resource_progress",
  "glossary_srs",
  "xp_events",
  "user_badges",
  "study_log",
  "custom_resources",
  "api_usage",
];

/** Reemplaza TODO el progreso por el del archivo. Lo que ya no existe en el contenido se omite y se informa. */
export async function importProgress(raw: unknown) {
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) throw new Error("El archivo no es una exportación válida de QuestMap.");
  const data = parsed.data as unknown as ProgressExport;
  const m = await loadMaps();
  const skipped: string[] = [];
  const qid = (slug: string | null | undefined) => (slug ? (m.questId.get(slug) ?? null) : null);

  await db.transaction(async (tx) => {
    for (const t of PROGRESS_TABLES_DELETE_ORDER) await tx.execute(sql.raw(`DELETE FROM ${t}`));

    await tx
      .insert(s.profile)
      .values({ id: 1, xpTotal: data.profile.xpTotal })
      .onConflictDoUpdate({ target: s.profile.id, set: { xpTotal: data.profile.xpTotal } });

    for (const r of data.questProgress) {
      const id = qid(r.quest);
      if (!id) {
        skipped.push(`quest ${r.quest}`);
        continue;
      }
      await tx.insert(s.questProgress).values({
        questId: id,
        status: r.status,
        completedAt: d(r.completedAt),
        xpAwarded: r.xpAwarded,
        hintsUsed: r.hintsUsed,
        notes: r.notes,
        evidence: r.evidence,
      });
    }
    for (const r of data.resourceProgress) {
      const id = m.resourceId.get(r.resource);
      if (id) await tx.insert(s.resourceProgress).values({ resourceId: id, seen: r.seen, note: r.note });
    }
    for (const a of data.quizAttempts) {
      const id = qid(a.quest);
      if (!id) continue;
      const [row] = await tx
        .insert(s.quizAttempts)
        .values({ questId: id, score: a.score, passed: a.passed, startedAt: d(a.startedAt) ?? new Date(), finishedAt: d(a.finishedAt) })
        .returning({ id: s.quizAttempts.id });
      for (const x of a.answers) {
        const qq = m.questionId.get(x.question);
        if (qq) await tx.insert(s.quizAnswers).values({ attemptId: row.id, questionId: qq, answer: x.answer, correct: x.correct });
      }
    }
    for (const r of data.glossarySrs) {
      const id = m.termId.get(r.term);
      if (id)
        await tx.insert(s.glossarySrs).values({
          termId: id,
          ease: r.ease,
          intervalDays: r.intervalDays,
          dueAt: d(r.dueAt) ?? new Date(),
          reps: r.reps,
          lapses: r.lapses,
        });
    }
    for (const x of data.interviewSessions) {
      const [row] = await tx
        .insert(s.interviewSessions)
        .values({
          templateId: x.template ? (m.templateId.get(x.template) ?? null) : null,
          questId: qid(x.quest),
          mode: x.mode,
          startedAt: d(x.startedAt) ?? new Date(),
          finishedAt: d(x.finishedAt),
          score: x.score,
          rubric: x.rubric,
          feedbackMd: x.feedbackMd,
          modeSource: x.modeSource,
          context: x.context as Record<string, unknown> | null,
          prompt: x.prompt,
          apiTokens: x.apiTokens ?? 0,
        })
        .returning({ id: s.interviewSessions.id });
      for (const t of x.turns)
        await tx.insert(s.interviewTurns).values({ sessionId: row.id, role: t.role, content: t.content, createdAt: d(t.createdAt) ?? new Date() });
    }
    for (const e of data.xpEvents)
      await tx.insert(s.xpEvents).values({ reason: e.reason, amount: e.amount, questId: qid(e.quest), createdAt: d(e.createdAt) ?? new Date() });
    for (const b of data.badges) {
      const id = m.badgeId.get(b.badge);
      if (id) await tx.insert(s.userBadges).values({ badgeId: id, awardedAt: d(b.awardedAt) ?? new Date() });
    }
    for (const l of data.studyLog)
      await tx.insert(s.studyLog).values({ date: l.date, minutes: l.minutes, activity: l.activity, questId: qid(l.quest) });
    for (const c of data.customResources) await tx.insert(s.customResources).values(c);
    for (const u of data.apiUsage) await tx.insert(s.apiUsage).values(u);
    for (const e of data.evaluations)
      await tx.insert(s.evaluations).values({
        questId: qid(e.quest),
        kind: e.kind,
        answer: e.answer,
        prompt: e.prompt,
        rawResponse: e.rawResponse,
        score: e.score,
        rubric: e.rubric,
        modeSource: e.modeSource,
        apiTokens: e.apiTokens ?? 0,
        createdAt: d(e.createdAt) ?? new Date(),
      });
    for (const r of data.reviewQueue)
      await tx.insert(s.reviewQueue).values({ topic: r.topic, source: r.source, doneAt: d(r.doneAt), createdAt: d(r.createdAt) ?? new Date() });
  });

  return {
    questProgress: data.questProgress.length - skipped.length,
    studyDays: new Set(data.studyLog.map((l) => l.date)).size,
    xpTotal: data.profile.xpTotal,
    skipped,
  };
}

/* ------------------------------------------------------------- reiniciar zona */

/** Borra el progreso de una zona (quests, intentos, evaluaciones, sesiones y su XP) y recalcula el XP total. */
export async function resetZone(zoneSlug: string) {
  const [zone] = await db.select().from(s.zones).where(eq(s.zones.slug, zoneSlug));
  if (!zone) throw new Error("Zona no encontrada.");
  const levels = await db.select({ id: s.levels.id, slug: s.levels.slug }).from(s.levels).where(eq(s.levels.zoneId, zone.id));
  const levelIds = levels.map((l) => l.id);
  const quests = levelIds.length
    ? await db.select({ id: s.quests.id }).from(s.quests).where(inArray(s.quests.levelId, levelIds))
    : [];
  const questIds = quests.map((q) => q.id);

  await db.transaction(async (tx) => {
    if (questIds.length) {
      const attempts = await tx.select({ id: s.quizAttempts.id }).from(s.quizAttempts).where(inArray(s.quizAttempts.questId, questIds));
      if (attempts.length) await tx.delete(s.quizAnswers).where(inArray(s.quizAnswers.attemptId, attempts.map((a) => a.id)));
      await tx.delete(s.quizAttempts).where(inArray(s.quizAttempts.questId, questIds));
      const sessions = await tx
        .select({ id: s.interviewSessions.id })
        .from(s.interviewSessions)
        .where(inArray(s.interviewSessions.questId, questIds));
      if (sessions.length) {
        await tx.delete(s.interviewTurns).where(inArray(s.interviewTurns.sessionId, sessions.map((x) => x.id)));
        await tx.delete(s.interviewSessions).where(inArray(s.interviewSessions.id, sessions.map((x) => x.id)));
      }
      await tx.delete(s.evaluations).where(inArray(s.evaluations.questId, questIds));
      await tx.delete(s.questProgress).where(inArray(s.questProgress.questId, questIds));
      await tx.delete(s.xpEvents).where(inArray(s.xpEvents.questId, questIds));
    }
    // Bonos de nivel y zona (no tienen quest_id).
    const bonusReasons = [eq(s.xpEvents.reason, `zone:${zone.slug}`), ...levels.map((l) => eq(s.xpEvents.reason, `level:${l.slug}`))];
    await tx.delete(s.xpEvents).where(or(...bonusReasons));
    const [badge] = await tx.select({ id: s.badges.id }).from(s.badges).where(eq(s.badges.slug, `badge-zone-${zone.slug}`));
    if (badge) await tx.delete(s.userBadges).where(eq(s.userBadges.badgeId, badge.id));
    // XP total = suma de eventos restantes.
    const [{ total }] = (await tx.execute(sql`select coalesce(sum(amount), 0)::int as total from xp_events`)).rows as { total: number }[];
    await tx.update(s.profile).set({ xpTotal: total }).where(eq(s.profile.id, 1));
  });
  // El tiempo de estudio (study_log) se conserva: la racha refleja días reales estudiados.
  return { quests: questIds.length };
}
