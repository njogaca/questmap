import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema as s } from "@/db/client";
import { ProgressChart, type ChartPoint } from "@/components/claude/ProgressChart";
import { StartInterviewButton } from "@/components/claude/StartInterviewButton";
import { apiConfig } from "@/lib/claude/client";
import { gradingSchema } from "@/lib/claude/grading";
import { MODE_LABEL, type InterviewMode } from "@/lib/claude/prompts";
import { topImprovements } from "@/lib/claude/top3";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interview Arena" };

const MODE_INFO: Record<string, { title: string; desc: string }> = {
  behavioral: { title: "Behavioral (STAR)", desc: "5 preguntas conductuales al azar. Responde con Situation, Task, Action, Result y un número al final." },
  technical_screen: { title: "Technical screen", desc: "6 preguntas por zona con repreguntas, como un primer filtro técnico real." },
  system_design: { title: "System design", desc: "30–45 min. Diseña en voz alta (texto + Mermaid) y defiende tus trade-offs." },
  coding_task: { title: "Coding task", desc: "Take-home de 60–90 min. Entregas el repo o el código y lo defiendes." },
};

// El mock loop se desbloquea al vencer a los jefes de las zonas 1, 2 y 3.
const MOCK_LOOP_REQUIRES = ["java-5-boss", "eda-5-boss", "cassandra-5-boss"];

export default async function ArenaPage() {
  const [templates, sessions, world] = await Promise.all([
    db.select().from(s.interviewTemplates).where(eq(s.interviewTemplates.status, "published")).orderBy(asc(s.interviewTemplates.id)),
    db.select().from(s.interviewSessions).orderBy(desc(s.interviewSessions.startedAt)).limit(30),
    loadWorld(),
  ]);
  const api = apiConfig();
  const mockUnlocked = MOCK_LOOP_REQUIRES.every((slug) => world.levels.find((l) => l.slug === slug)?.progress.completed);

  const finished = sessions
    .filter((x) => x.finishedAt && x.rubric)
    .map((x) => ({ x, g: gradingSchema.safeParse(x.rubric) }))
    .filter((r) => r.g.success)
    .reverse();
  const points: ChartPoint[] = finished.slice(-12).map(({ x, g }) => ({
    id: x.id,
    label: `#${x.id}`,
    criteria: Object.fromEntries(g.data!.criteria.map((c) => [c.name, c.score])),
  }));
  const latest = finished.at(-1);

  const byMode = (mode: string) => templates.filter((t) => t.mode === mode);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="font-mono text-xs text-available">&gt; questmap://arena</p>
      <h1 className="mt-1 text-3xl font-bold">🎯 Interview Arena</h1>
      <p className="mt-1 max-w-2xl text-sm text-dim">
        Simulaciones de entrevista en inglés con Claude como entrevistador de Home Depot. Retroalimentación de lenguaje en español.
      </p>
      <p className="mt-2 font-mono text-xs">
        {api.configured ? (
          <span className="text-done">● Modo B disponible (API · {api.model})</span>
        ) : (
          <span className="text-dim">
            ● Modo A (copiar/pegar en claude.ai, $0). Para el Modo B configura la API en{" "}
            <Link href="/ajustes" className="text-available hover:underline">
              Ajustes
            </Link>
            .
          </span>
        )}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(["behavioral", "technical_screen", "system_design", "coding_task"] as const).map((mode) => (
          <section key={mode} className="hud-panel p-4">
            <h2 className="text-lg font-semibold">{MODE_INFO[mode].title}</h2>
            <p className="mt-1 text-sm text-dim">{MODE_INFO[mode].desc}</p>
            <div className="mt-3 grid gap-2">
              {byMode(mode).map((t) => (
                <StartInterviewButton key={t.slug} templateSlug={t.slug} label={t.title} primary={byMode(mode).length === 1} />
              ))}
            </div>
          </section>
        ))}
        <section className={`hud-panel p-4 md:col-span-2 ${mockUnlocked ? "hud-panel-progress hud-corners" : "opacity-70"}`}>
          <h2 className="text-lg font-semibold">Mock loop completo</h2>
          <p className="mt-1 text-sm text-dim">
            45–60 min: técnico + conductual + diseño, en secuencia. {mockUnlocked ? "" : "Se desbloquea al vencer a los jefes de Java Forest, Event Harbor y Cassandra Caverns."}
          </p>
          <div className="mt-3 max-w-xs">
            <StartInterviewButton mode="mock_loop" label={mockUnlocked ? "Empezar mock loop" : "🔒 Bloqueado"} primary disabled={!mockUnlocked} />
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="hud-panel p-4">
          <h2 className="text-lg font-semibold">Progreso por criterio</h2>
          <div className="mt-3">
            <ProgressChart points={points} />
          </div>
        </section>
        <section className="hud-panel p-4">
          <h2 className="text-lg font-semibold">Top 3 a mejorar</h2>
          {latest?.g.success ? (
            <>
              <p className="mt-1 font-mono text-xs text-dim">de tu última sesión (#{latest.x.id})</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
                {topImprovements(latest.g.data).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-2 text-sm text-dim">Aparecerá cuando termines tu primera sesión.</p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Historial</h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-dim">Todavía no hay sesiones.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {sessions.map((x) => (
              <li key={x.id}>
                <Link
                  href={`/arena/session/${x.id}`}
                  className="hud-item flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-mono text-xs text-dim">#{x.id} · </span>
                    {(x.context as { title?: string } | null)?.title ?? MODE_LABEL[x.mode as InterviewMode]}
                  </span>
                  <span className="font-mono text-xs">
                    <span className="text-dim">{x.startedAt.toLocaleDateString("es")} · </span>
                    {x.finishedAt ? (
                      <span style={{ color: (x.score ?? 0) >= 70 ? "var(--na-done)" : "var(--na-progress)" }}>{x.score}/100</span>
                    ) : (
                      <span className="text-warn">en curso</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
