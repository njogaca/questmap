import { asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const status = await getStatus();
  const tz = process.env.TZ || "UTC";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-xs text-available">&gt; questmap://boot</p>
      <h1 className="mt-2 text-4xl font-bold text-ink">
        QUEST<span className="text-available">MAP</span>
      </h1>
      <p className="mt-2 text-dim">Mapa de logros para conseguir el trabajo. Fase 1: cimientos.</p>

      <section className="mt-8 rounded-lg border border-line bg-surface p-5">
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
        <section className="mt-6 rounded-lg border border-line bg-surface p-5">
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
