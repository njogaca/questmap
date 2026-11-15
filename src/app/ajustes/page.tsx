import { asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { BackupPanel } from "@/components/BackupPanel";
import { EffectsSettings } from "@/components/effects/EffectsSettings";
import { apiConfig, usageToday } from "@/lib/claude/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes" };

async function getStatus() {
  try {
    const [counts] = (
      await db.execute(sql`
        select
          (select count(*)::int from zones  where status <> 'archived') as zones,
          (select count(*)::int from levels where status <> 'archived') as levels,
          (select count(*)::int from quests where status = 'published') as quests,
          (select count(*)::int from glossary_terms where status = 'published') as terms
      `)
    ).rows as { zones: number; levels: number; quests: number; terms: number }[];
    const skills = await db
      .select({ code: s.skills.code, name: s.skills.name, core: s.skills.core, targetXp: s.skills.targetXp })
      .from(s.skills)
      .where(eq(s.skills.status, "published"))
      .orderBy(asc(s.skills.order));
    return { ok: true as const, counts, skills };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getApiStats() {
  const [totals] = (
    await db.execute(sql`
      select
        (select coalesce(sum(calls), 0)::int from api_usage) as calls,
        (select coalesce(sum(tokens_approx), 0)::int from api_usage) as tokens,
        (select count(*)::int from interview_sessions where api_tokens > 0) as api_sessions,
        (select coalesce(avg(api_tokens), 0)::int from interview_sessions where api_tokens > 0) as avg_session_tokens,
        (select count(*)::int from evaluations where api_tokens > 0) as api_evals,
        (select coalesce(avg(api_tokens), 0)::int from evaluations where api_tokens > 0) as avg_eval_tokens
    `)
  ).rows as {
    calls: number;
    tokens: number;
    api_sessions: number;
    avg_session_tokens: number;
    api_evals: number;
    avg_eval_tokens: number;
  }[];
  return totals;
}

export default async function Ajustes() {
  const status = await getStatus();
  const tz = process.env.TZ || "UTC";
  const api = apiConfig();
  const [today, stats, zones] = await Promise.all([
    usageToday().catch(() => ({ calls: 0, tokens: 0 })),
    getApiStats().catch(() => null),
    db
      .select({ slug: s.zones.slug, title: s.zones.title })
      .from(s.zones)
      .where(eq(s.zones.status, "published"))
      .orderBy(asc(s.zones.order))
      .catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-xs text-available">&gt; questmap://ajustes</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Ajustes</h1>
      <p className="mt-2 text-dim">Claude, estado del sistema y contenido cargado.</p>

      <section className="hud-panel mt-8 p-5">
        <h2 className="text-xl font-semibold">Claude</h2>
        {api.configured ? (
          <p className="mt-3 font-mono text-sm text-done">● Modo B activo · modelo {api.model}</p>
        ) : (
          <p className="mt-3 font-mono text-sm text-warn">● Modo A (sin API, costo $0)</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Llamadas hoy", `${today.calls} / ${api.maxPerDay}`],
              ["Tokens hoy", `~${today.tokens.toLocaleString("es")}`],
              ["Tokens por sesión", stats ? `~${stats.avg_session_tokens.toLocaleString("es")}` : "—"],
              ["Tokens por calificación", stats ? `~${stats.avg_eval_tokens.toLocaleString("es")}` : "—"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-md bg-surface-2 p-3">
              <dt className="text-xs text-dim">{label}</dt>
              <dd className="font-title text-xl text-available">{value}</dd>
            </div>
          ))}
        </dl>
        {stats && (
          <p className="mt-3 font-mono text-xs text-dim">
            total histórico: {stats.calls} llamadas · ~{stats.tokens.toLocaleString("es")} tokens · {stats.api_sessions} entrevistas y{" "}
            {stats.api_evals} calificaciones con la API
          </p>
        )}
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-dim">
          <p>
            Para activar el Modo B, edita <code className="text-available">.env</code> (la clave se queda en el servidor, nunca llega al
            navegador) y reconstruye:
          </p>
          <pre className="overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-done">{`ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-5-5
MAX_API_CALLS_PER_DAY=50`}</pre>
          <pre className="overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-done">docker compose up -d --build</pre>
          <p>
            Si la API falla o llegas al tope diario, la app cae al Modo A sin perder lo que escribiste. Con modelos que lo soportan se
            activa el fallback del servidor: si el modelo declina una petición, la API la reintenta con otro modelo.
          </p>
        </div>
      </section>

      <section className="hud-panel mt-6 p-5">
        <h2 className="text-xl font-semibold">Respaldo</h2>
        <p className="mt-2 text-sm text-dim">
          Red de seguridad principal: respaldo completo de la base de datos con PowerShell (desde la carpeta del repo).
        </p>
        <pre className="mt-2 overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-done">.\scripts\backup.ps1</pre>
        <pre className="mt-2 overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-done">.\scripts\restore.ps1 backups\questmap_AAAAMMDD_HHmm.sql</pre>
        <div className="mt-5">
          <BackupPanel zones={zones} />
        </div>
      </section>

      <section className="hud-panel mt-6 p-5">
        <h2 className="text-xl font-semibold">Efectos</h2>
        <div className="mt-3">
          <EffectsSettings />
        </div>
      </section>

      <section className="hud-panel mt-8 p-5">
        <h2 className="text-xl font-semibold">Estado del sistema</h2>
        {status.ok ? (
          <>
            <p className="mt-3 font-mono text-sm text-done">● base de datos conectada</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Zonas", status.counts.zones],
                  ["Niveles", status.counts.levels],
                  ["Quests", status.counts.quests],
                  ["Términos", status.counts.terms],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-md bg-surface-2 p-3">
                  <dt className="text-xs text-dim">{label}</dt>
                  <dd className="font-title text-2xl text-available">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="mt-3 font-mono text-sm text-progress">● sin conexión a la BD: {status.error}</p>
        )}
        <p className="mt-4 font-mono text-xs text-dim">zona horaria: {tz}</p>
      </section>

      {status.ok && (
        <section className="hud-panel mt-6 p-5">
          <h2 className="text-xl font-semibold">Skills de la oferta</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {status.skills.map((sk) => (
              <li key={sk.code} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span>
                  {sk.name}
                  {sk.core && <span className="ml-2 font-mono text-xs text-progress">core</span>}
                </span>
                <span className="font-mono text-xs text-dim">{sk.targetXp} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
