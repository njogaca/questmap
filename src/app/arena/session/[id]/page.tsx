import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db/client";
import { GradeView } from "@/components/claude/GradeView";
import { SessionRunner } from "@/components/claude/SessionRunner";
import { BlockText } from "@/components/BlockText";
import { apiConfig } from "@/lib/claude/client";
import { gradingSchema } from "@/lib/claude/grading";
import { INTERVIEW_END_MARKER, MODE_LABEL, type InterviewContext, type InterviewMode } from "@/lib/claude/prompts";
import { topImprovements } from "@/lib/claude/top3";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [session] = await db.select().from(s.interviewSessions).where(eq(s.interviewSessions.id, id));
  if (!session) notFound();
  const turns = await db.select().from(s.interviewTurns).where(eq(s.interviewTurns.sessionId, id)).orderBy(asc(s.interviewTurns.id));
  const ctx = session.context as unknown as InterviewContext;
  const [quest] = session.questId
    ? await db.select({ slug: s.quests.slug, title: s.quests.title }).from(s.quests).where(eq(s.quests.id, session.questId))
    : [];
  const grading = session.rubric ? gradingSchema.safeParse(session.rubric) : null;
  const dialog = turns.filter((t) => t.role === "user" || t.role === "assistant");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href={quest ? `/quest/${quest.slug}` : "/arena"} className="font-mono text-xs text-dim hover:text-available">
        &lt; {quest ? quest.title : "Interview Arena"}
      </Link>
      <p className="mt-4 font-mono text-xs text-available">
        &gt; {MODE_LABEL[session.mode as InterviewMode] ?? session.mode} · sesión #{session.id}
      </p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{ctx.title}</h1>
      {ctx.zoneTitle && <p className="text-sm text-dim">{ctx.zoneTitle}</p>}

      {(ctx.statement || ctx.deliverable) && (
        <details className="mt-4 rounded-md border border-line bg-surface p-4 text-sm" open={!session.finishedAt && !!ctx.statement}>
          <summary className="cursor-pointer font-mono text-xs text-dim">enunciado y entregable</summary>
          {ctx.statement && (
            <div className="mt-2">
              <BlockText text={ctx.statement} />
            </div>
          )}
          {ctx.deliverable && (
            <div className="mt-3">
              <p className="font-mono text-xs text-dim">tu entregable</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{ctx.deliverable}</pre>
            </div>
          )}
        </details>
      )}

      <div className="mt-6">
        {session.finishedAt && grading?.success ? (
          <div className="space-y-4">
            <GradeView grading={grading.data} feedback={session.feedbackMd} />
            <section className="rounded-md border border-warn/60 bg-surface p-4">
              <h2 className="font-semibold">Top 3 cosas a mejorar</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
                {topImprovements(grading.data).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>
            <p className="font-mono text-xs text-dim">
              {session.modeSource === "api" ? "calificada con la API" : "calificada en claude.ai (Modo A)"}
              {session.apiTokens > 0 && ` · ~${session.apiTokens.toLocaleString("es")} tokens`}
              {quest && grading.data.score >= 70 && " · quest completada ✓"}
            </p>
            {dialog.length > 1 && (
              <details className="rounded-md border border-line bg-surface p-4">
                <summary className="cursor-pointer font-mono text-xs text-dim">transcripción</summary>
                <div className="mt-3 space-y-2 text-sm">
                  {dialog.slice(1).map((t) => (
                    <p key={t.id} className="whitespace-pre-line">
                      <span className="font-mono text-xs text-available">{t.role === "assistant" ? "Interviewer" : "You"}: </span>
                      {t.content}
                    </p>
                  ))}
                </div>
              </details>
            )}
            <Link href="/arena" className="inline-block font-mono text-sm text-available hover:underline">
              &gt; volver a la arena
            </Link>
          </div>
        ) : (
          <SessionRunner
            sessionId={session.id}
            startedAt={session.startedAt.toISOString()}
            durationMin={ctx.durationMin}
            turns={turns.map((t) => ({ id: t.id, role: t.role, content: t.content }))}
            prompt={session.prompt ?? ""}
            apiAvailable={apiConfig().configured}
            endMarker={INTERVIEW_END_MARKER}
          />
        )}
      </div>
    </main>
  );
}
