import { WorldMap, type MapEdge, type MapZone } from "@/components/WorldMap";
import { ProgressBar, StateBadge } from "@/components/StateBadge";
import Link from "next/link";
import { decryptRatio, encrypt } from "@/lib/encrypt";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mapa" };

export default async function MapPage() {
  const world = await loadWorld();

  const zones: MapZone[] = world.zones.map((z) => ({
    id: z.id,
    slug: z.slug,
    title: z.title,
    order: z.order,
    emoji: z.emoji,
    x: z.mapX,
    y: z.mapY,
    state: z.progress.state,
    percent: z.progress.percent,
    levelsCompleted: z.progress.levelsCompleted,
    skills: z.skills.map((code) => ({ code, name: world.skillNames.get(code) ?? code })),
    prereqs: z.prereqs.map((p) => ({ zoneTitle: p.zoneTitle, level: p.level, met: p.met })),
  }));

  const zoneById = new Map(world.zones.map((z) => [z.id, z]));
  const edges: MapEdge[] = world.prereqEdges.map((e) => {
    const target = zoneById.get(e.to);
    const from = zoneById.get(e.from);
    const met = !!target?.prereqs.find((p) => p.zoneSlug === from?.slug)?.met;
    return { ...e, met };
  });

  return (
    <main className="mx-auto w-full px-4 py-6 2xl:px-10">
      <p className="font-mono text-xs text-available">&gt; questmap://atlas</p>
      <h1 className="mt-1 text-3xl font-bold">Mapa del reino</h1>
      <p className="mt-1 max-w-2xl text-sm text-dim">
        Cada sector es una zona de estudio. Completa niveles para comprometer nodos y abrir caminos hacia la oferta.
      </p>

      <div className="mt-5">
        <WorldMap zones={zones} edges={edges} />
      </div>

      {/* Lista compacta: útil en el celular y para lectores de pantalla */}
      <section className="ui-hud mt-6">
        <h2 className="text-xl font-semibold">Sectores</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {world.zones.map((z) => (
            <li key={z.id}>
              <Link
                href={`/zone/${z.slug}`}
                className="hud-item block p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="mr-2">{z.emoji}</span>
                    {z.progress.state === "locked" ? (
                      <span className="font-mono text-lg text-dim" aria-label={`${z.title} (bloqueado)`}>
                        {encrypt(z.title, decryptRatio(z.prereqs))}
                      </span>
                    ) : (
                      <span className="font-title text-lg">{z.title}</span>
                    )}
                  </span>
                  <StateBadge state={z.progress.state} />
                </div>
                <div className="mt-2">
                  <ProgressBar percent={z.progress.percent} state={z.progress.state} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
