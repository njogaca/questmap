import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db/client";
import type { Card } from "@/components/Flashcards";
import { GlossaryQuest } from "@/components/quest/GlossaryQuest";
import { InterviewStart } from "@/components/quest/InterviewStart";
import { LabQuest, type LabPayload } from "@/components/quest/LabQuest";
import { OpenAnswerQuest } from "@/components/quest/OpenAnswerQuest";
import { LearnQuest } from "@/components/quest/LearnQuest";
import { MicroQuest } from "@/components/quest/MicroQuest";
import { QuizRunner, type ClientQuestion } from "@/components/quest/QuizRunner";
import { StateBadge } from "@/components/StateBadge";
import { QUEST_STATE_TEXT, QUEST_TYPE_TEXT } from "@/components/state";
import type { QuizQuestionPayload } from "@/lib/quiz";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const world = await loadWorld();
  const quest = world.quests.find((q) => q.slug === slug);
  return { title: quest?.title ?? "Nodo no encontrado" };
}

async function cardsFor(termSlugs: string[] | undefined, zoneSlug: string, limit = 50): Promise<Card[]> {
  const where = termSlugs?.length
    ? and(inArray(s.glossaryTerms.slug, termSlugs), eq(s.glossaryTerms.status, "published"))
    : and(eq(s.glossaryTerms.zoneSlug, zoneSlug), eq(s.glossaryTerms.status, "published"));
  const rows = await db.select().from(s.glossaryTerms).where(where).orderBy(asc(s.glossaryTerms.id)).limit(limit);
  return rows.map((t) => ({
    id: t.id,
    term: t.term,
    category: t.category,
    definitionEs: t.definitionEs,
    definitionEn: t.definitionEn,
    exampleEn: t.exampleEn,
    analogy: t.analogy,
    analogyMq: t.analogyMq,
  }));
}

export default async function QuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const world = await loadWorld();
  const quest = world.quests.find((q) => q.slug === slug);
  if (!quest) notFound();
  const level = world.levels.find((l) => l.id === quest.levelId)!;
  const zone = world.zones.find((z) => z.id === level.zoneId)!;
  const completed = quest.state === "completed";
  const locked = quest.state === "locked";
  const payload = quest.payload as Record<string, unknown>;

  let body: React.ReactNode = null;

  if (quest.status === "outline") {
    body = (
      <div className="rounded-md border border-dashed border-line bg-surface p-4 text-sm text-dim">
        <p>Esta quest es un esqueleto: su contenido todavía no está escrito.</p>
        <p className="mt-2">Para generarlo (prompt para Claude, validación y carga):</p>
        <pre className="mt-2 overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-done">
          npm run content:new -- --zone {zone.slug} --level {level.number}
        </pre>
      </div>
    );
  } else if (locked) {
    body = (
      <p className="rounded-md border border-locked bg-surface p-4 text-sm text-dim">
        Esta quest está bloqueada: completa los niveles anteriores para acceder.
      </p>
    );
  } else if (quest.type === "learn") {
    const links = await db
      .select({ r: s.resources, qr: s.questResources })
      .from(s.questResources)
      .innerJoin(s.resources, eq(s.resources.id, s.questResources.resourceId))
      .where(eq(s.questResources.questId, quest.id))
      .orderBy(asc(s.questResources.order));
    const ids = links.map((l) => l.r.id);
    const seen = ids.length
      ? await db.select().from(s.resourceProgress).where(inArray(s.resourceProgress.resourceId, ids))
      : [];
    const seenSet = new Set(seen.filter((x) => x.seen).map((x) => x.resourceId));
    const custom = await db.select().from(s.customResources).where(eq(s.customResources.questSlug, quest.slug));
    const [prog] = await db.select().from(s.questProgress).where(eq(s.questProgress.questId, quest.id));
    body = (
      <LearnQuest
        slug={quest.slug}
        completed={completed}
        notePrompt={String(payload.note_prompt ?? "Explica con tus palabras (2–3 líneas) lo más importante que aprendiste.")}
        savedNote={prog?.notes ?? ""}
        summary={(payload.summary_md as string | undefined) ?? undefined}
        resources={links.map(({ r, qr }) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          url: r.url,
          howToFind: r.howToFind,
          language: r.language,
          durationMin: r.durationMin,
          cost: r.cost,
          why: r.why,
          verified: r.verified,
          required: qr.required,
          seen: seenSet.has(r.id),
        }))}
        custom={custom.map((c) => ({ id: c.id, title: c.title, url: c.url, type: c.type, notes: c.notes }))}
      />
    );
  } else if (quest.type === "glossary") {
    const cards = await cardsFor(payload.terms as string[] | undefined, zone.slug);
    body = <GlossaryQuest slug={quest.slug} cards={cards} completed={completed} />;
  } else if (quest.type === "quiz") {
    const rows = await db
      .select()
      .from(s.quizQuestions)
      .where(and(eq(s.quizQuestions.questId, quest.id), eq(s.quizQuestions.status, "published")))
      .orderBy(asc(s.quizQuestions.order));
    // Nunca enviar `answer` ni `explanation` al navegador.
    const questions: ClientQuestion[] = rows.map((r) => {
      const p = r.payload as unknown as QuizQuestionPayload;
      return {
        id: r.id,
        type: r.type as ClientQuestion["type"],
        prompt: p.prompt,
        options: p.options,
        hint: p.hint,
        difficulty: p.difficulty,
      };
    });
    const history = await db
      .select()
      .from(s.quizAttempts)
      .where(eq(s.quizAttempts.questId, quest.id))
      .orderBy(desc(s.quizAttempts.finishedAt))
      .limit(10);
    body = (
      <QuizRunner
        slug={quest.slug}
        questions={questions}
        completed={completed}
        history={history.map((h) => ({
          id: h.id,
          score: h.score,
          passed: h.passed,
          finishedAt: h.finishedAt?.toISOString() ?? null,
        }))}
      />
    );
  } else if (quest.type === "lab") {
    const [prog] = await db.select().from(s.questProgress).where(eq(s.questProgress.questId, quest.id));
    body = (
      <LabQuest slug={quest.slug} payload={payload as LabPayload} completed={completed} savedEvidence={prog?.evidence ?? ""} />
    );
  } else if (quest.type === "micro") {
    const kind = String(payload.kind ?? "flashcards");
    const cards = kind === "flashcards" ? (await cardsFor(payload.terms as string[] | undefined, zone.slug)).slice(0, 10) : [];
    body = (
      <MicroQuest
        slug={quest.slug}
        kind={kind}
        instructions={(payload.instructions as string | undefined) ?? null}
        cards={cards}
        completed={completed}
      />
    );
  } else {
    body = (
      <p className="rounded-md border border-dashed border-line bg-surface p-4 text-sm text-dim">
        Tipo de quest no soportado: {quest.type}.
      </p>
    );
  }

  if (!locked && quest.type === "open_answer") {
    const history = await db
      .select({ id: s.evaluations.id, score: s.evaluations.score, createdAt: s.evaluations.createdAt })
      .from(s.evaluations)
      .where(eq(s.evaluations.questId, quest.id))
      .orderBy(desc(s.evaluations.createdAt))
      .limit(10);
    body = (
      <OpenAnswerQuest
        slug={quest.slug}
        promptEn={String(payload.prompt_en ?? quest.title)}
        completed={completed}
        history={history.map((h) => ({ id: h.id, score: h.score, createdAt: h.createdAt.toISOString() }))}
      />
    );
  } else if (!locked && (quest.type === "boss" || quest.type === "interview")) {
    const sessions = await db
      .select({
        id: s.interviewSessions.id,
        score: s.interviewSessions.score,
        startedAt: s.interviewSessions.startedAt,
        finishedAt: s.interviewSessions.finishedAt,
      })
      .from(s.interviewSessions)
      .where(eq(s.interviewSessions.questId, quest.id))
      .orderBy(desc(s.interviewSessions.startedAt))
      .limit(10);
    body = (
      <InterviewStart
        slug={quest.slug}
        type={quest.type}
        task={payload.task as string | undefined}
        focus={payload.interview_focus as string[] | undefined}
        completed={completed}
        sessions={sessions.map((x) => ({
          id: x.id,
          score: x.score,
          startedAt: x.startedAt.toISOString(),
          finishedAt: x.finishedAt?.toISOString() ?? null,
        }))}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href={`/level/${level.slug}`} className="font-mono text-xs text-dim hover:text-available">
        &lt; {zone.emoji} nivel {level.number}: {level.title}
      </Link>
      <p className="mt-4 font-mono text-xs text-available">&gt; quest · {QUEST_TYPE_TEXT[quest.type] ?? quest.type}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{quest.title}</h1>
        <StateBadge
          state={quest.state === "in_progress" ? "in_progress" : quest.state}
          label={QUEST_STATE_TEXT[quest.state]}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-dim">
        {quest.xp} XP · ~{quest.estimatedMin} min · {quest.required ? "obligatoria" : "opcional"}
        {quest.skills.length > 0 &&
          ` · ${quest.skills.map((sk) => world.skillNames.get(sk.code) ?? sk.code).join(", ")}`}
      </p>

      <div className="mt-6">{body}</div>
    </main>
  );
}
