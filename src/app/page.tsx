import Link from "next/link";
import { ManualMinutes } from "@/components/ManualMinutes";
import { RadarChart } from "@/components/RadarChart";
import { ReviewItem } from "@/components/ReviewItem";
import { QUEST_TYPE_TEXT } from "@/components/state";
import { btnPrimary } from "@/components/ui";
import { loadDashboard, type Recommendation } from "@/lib/dashboard";
import { READY_THRESHOLD } from "@/lib/readiness";
import { STREAK_MIN_MINUTES } from "@/lib/streak";

export const dynamic = "force-dynamic";

const SHORT: Record<string, string> = {
  java: "Java",
  eda: "EDA",
  cassandra: "Cassandra",
  bigquery_sql: "BigQuery",
  observability: "Observ.",
  ai_tools: "IA",
  microservices_gcp: "GCP",
  cicd: "CI/CD",
  git: "Git",
  debugging_rca: "RCA",
  security: "Security",
  testing: "Testing",
  english: "English",
  distributed_systems: "Dist. Sys",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`hud-panel p-4 ${className}`}>{children}</section>;
}

function QuestLink({ rec, label }: { rec: Recommendation; label?: string }) {
  return (
    <Link
      href={`/quest/${rec.slug}`}
      className="hud-item block p-3"
    >
      {label && <p className="font-mono text-xs text-available">{label}</p>}
      <p className="mt-0.5">{rec.title}</p>
      <p className="mt-0.5 font-mono text-xs text-dim">
        {rec.zoneEmoji} {rec.zoneTitle} · N{rec.levelNumber} · {QUEST_TYPE_TEXT[rec.type] ?? rec.type} · ~{rec.estimatedMin} min ·{" "}
        {rec.xp} XP
      </p>
      {rec.reason && <p className="mt-1 font-mono text-xs text-progress">{rec.reason}</p>}
    </Link>
  );
}

export default async function Dashboard() {
  const d = await loadDashboard();
  const maxWeek = Math.max(60, ...d.weeklyMinutes.map((w) => w.minutes));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <p className="font-mono text-xs text-available">&gt; questmap://inicio · {d.today}</p>
      <h1 className="mt-1 text-3xl font-bold">Daily Quest</h1>
      <p className="mt-1 text-sm text-dim">
        {d.isThursday
          ? "Hoy es jueves: bloque profundo de ~4 h. Ideal para labs y quizzes largos."
          : "Hoy tienes ~15 min en el trabajo para micro-quests, y la noche para avanzar en el mapa."}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* ---------- Daily Quest ---------- */}
        <Card className="lg:col-span-2">
          <p className="hud-label">01 // daily quest</p>
          <h2 className="mt-1 text-lg font-semibold">Misiones de hoy</h2>
          <div className="mt-3 grid gap-2">
            <Link
              href="/glosario/repaso"
              className="hud-item block p-3"
            >
              <p className="font-mono text-xs text-available">1 · micro de glosario · ~5 min</p>
              <p className="mt-0.5">
                {d.daily.dueCards > 0
                  ? `Repasar ${d.daily.dueCards} tarjeta(s) vencida(s)`
                  : d.daily.newCards > 0
                    ? `Aprender ${d.daily.newCards} término(s) nuevo(s)`
                    : "Glosario al día"}
              </p>
            </Link>
            {d.daily.english ? (
              <QuestLink rec={d.daily.english} label="2 · micro de inglés" />
            ) : (
              <div className="rounded-md border border-dashed border-line p-3 text-sm text-dim">
                <p className="font-mono text-xs">2 · micro de inglés</p>
                El English Track llega con el contenido de la Fase 4.
              </div>
            )}
            {d.daily.next ? (
              <QuestLink rec={d.daily.next} label="3 · siguiente quest del mapa" />
            ) : (
              <p className="rounded-md border border-dashed border-line p-3 text-sm text-dim">
                No hay quests abiertas por ahora. Revisa el <Link href="/mapa" className="text-available">mapa</Link>.
              </p>
            )}
          </div>
          {d.daily.reviews.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-xs text-warn">refuerzos sugeridos por Claude</p>
              <ul className="mt-2 space-y-1.5">
                {d.daily.reviews.map((r) => (
                  <ReviewItem key={r.id} id={r.id} topic={r.topic} />
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* ---------- Perfil ---------- */}
        <Card className="hud-corners">
          <p className="hud-label">operador</p>
          <p className="font-title text-2xl text-available">{d.rank.name}</p>
          <p className="font-mono text-sm">{d.xpTotal.toLocaleString("es")} XP</p>
          {d.rank.nextName && (
            <div className="mt-2">
              <div className="hud-bar h-2 w-full overflow-hidden">
                <div className="h-full bg-available" style={{ width: `${d.rank.percentToNext}%` }} />
              </div>
              <p className="mt-1 font-mono text-xs text-dim">
                {(d.rank.nextAt! - d.xpTotal).toLocaleString("es")} XP para {d.rank.nextName}
              </p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded bg-surface-2 p-2">
              <p className="font-mono text-xs text-dim">racha</p>
              <p className="font-title text-2xl" style={{ color: d.streak.todayDone ? "var(--na-done)" : "var(--na-warn)" }}>
                {d.streak.current} d
              </p>
              <p className="font-mono text-[11px] text-dim">mejor: {d.streak.best}</p>
            </div>
            <div className="rounded bg-surface-2 p-2">
              <p className="font-mono text-xs text-dim">hoy</p>
              <p className="font-title text-2xl">{d.streak.todayMinutes} min</p>
              <p className="font-mono text-[11px] text-dim">
                {d.streak.todayDone ? "día contado ✓" : `faltan ${STREAK_MIN_MINUTES - d.streak.todayMinutes} min`}
              </p>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim">
            congelación semanal: {d.streak.freezeUsedThisWeek ? "usada" : "disponible"}
          </p>
          <div className="mt-3">
            <ManualMinutes />
          </div>
        </Card>
      </div>

      {/* ---------- Job Readiness ---------- */}
      <p className="hud-label mt-8">02 // job readiness</p>
      <h2 className="mt-1 text-2xl font-bold">Job Readiness</h2>
      <div
        className={`hud-panel mt-3 p-4 ${d.readiness.readyToApply ? "hud-panel-done" : ""}`}
      >
        {d.readiness.readyToApply ? (
          <p className="font-title text-xl text-done">Estás listo para aplicar: todas las skills core están ≥ {READY_THRESHOLD} %.</p>
        ) : (
          <>
            <p>
              Estás listo para aplicar cuando todas las skills <span className="font-mono text-progress">core</span> estén ≥{" "}
              {READY_THRESHOLD} % de Readiness real. Te faltan {d.coreBelowWithNext.length}:
            </p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {d.coreBelowWithNext.map((sk) => (
                <li key={sk.code} className="flex justify-between gap-2 rounded bg-surface-2 px-3 py-1.5">
                  <span>
                    {sk.name} <span className="font-mono text-xs text-dim">{sk.readiness} %</span>
                  </span>
                  {sk.next ? (
                    <Link href={`/quest/${sk.next.slug}`} className="truncate font-mono text-xs text-available hover:underline">
                      › {sk.next.title}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-dim">sin quests abiertas</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">Readiness real</h3>
            <p className="font-title text-2xl text-available">{d.readiness.globalReadiness} %</p>
          </div>
          <p className="text-xs text-dim">
            Contra el objetivo completo de cada skill. Las zonas &ldquo;próximamente&rdquo; cuentan como 0.
          </p>
          <RadarChart
            threshold={READY_THRESHOLD}
            items={d.readiness.scores.map((sk) => ({
              code: sk.code,
              label: SHORT[sk.code] ?? sk.code,
              value: sk.readiness,
              core: sk.core,
            }))}
          />
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">Por skill</h3>
            <p className="font-mono text-xs text-dim">
              cobertura global <span className="text-ink">{d.readiness.globalCoverage} %</span>
            </p>
          </div>
          <p className="text-xs text-dim">
            <span className="text-available">■ Readiness real</span> (vs. objetivo) ·{" "}
            <span className="text-dim">□ Cobertura</span> (vs. contenido publicado)
          </p>
          <ul className="mt-3 space-y-2">
            {d.readiness.scores.map((sk) => (
              <li key={sk.code}>
                <div className="flex justify-between text-xs">
                  <span>
                    {sk.name}
                    {sk.core && <span className="ml-1 font-mono text-progress">core</span>}
                  </span>
                  <span className="font-mono text-dim">
                    {sk.readiness} % · cob. {sk.coverage === null ? "—" : `${sk.coverage} %`}
                  </span>
                </div>
                <div className="hud-bar relative mt-1 h-2 w-full">
                  <div
                    className="absolute inset-y-0 left-0 border border-dim/60"
                    style={{ width: `${sk.coverage ?? 0}%` }}
                    aria-hidden
                  />
                  <div className="absolute inset-y-0 left-0 bg-available" style={{ width: `${sk.readiness}%` }} />
                  <div className="absolute inset-y-0 w-px bg-warn" style={{ left: `${READY_THRESHOLD}%` }} aria-hidden />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------- Acciones, horas, insignias ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="font-semibold">Siguientes 3 acciones</h3>
          <div className="mt-3 space-y-2">
            {d.actions.length ? d.actions.map((a) => <QuestLink key={a.slug} rec={a} />) : <p className="text-sm text-dim">Nada pendiente.</p>}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">Horas por semana</h3>
          <div className="mt-4 flex h-32 items-end gap-1.5" role="img" aria-label="Minutos estudiados por semana, últimas 8 semanas">
            {d.weeklyMinutes.map((w, i) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[11px] text-dim">{(w.minutes / 60).toFixed(1)}</span>
                <div
                  className="w-full"
                  style={{
                    height: `${Math.max(2, (w.minutes / maxWeek) * 96)}px`,
                    background: i === d.weeklyMinutes.length - 1 ? "var(--na-available)" : "var(--na-locked)",
                  }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim">horas · últimas 8 semanas (la cian es esta semana)</p>
        </Card>

        <Card>
          <h3 className="font-semibold">Insignias</h3>
          {d.badges.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {d.badges.map((b) => (
                <li key={b.title} className="flex items-center gap-2">
                  <span className="text-warn">◆</span> {b.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-dim">Todavía ninguna. Tu primera puede ser un quiz perfecto.</p>
          )}
          <Link href="/mapa" className={`${btnPrimary} mt-4 w-full`}>
            &gt; abrir el mapa
          </Link>
        </Card>
      </div>
    </main>
  );
}
