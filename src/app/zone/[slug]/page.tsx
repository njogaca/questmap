import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressBar, StateBadge } from "@/components/StateBadge";
import { STATE_COLOR } from "@/components/state";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";

const RANK = ["", "Novice", "Apprentice", "Journeyman", "Expert", "Pro / Boss"];

export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const world = await loadWorld();
  const zone = world.zones.find((z) => z.slug === slug);
  if (!zone) notFound();

  const levels = world.levels.filter((l) => l.zoneId === zone.id).sort((a, b) => a.number - b.number);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/mapa" className="font-mono text-xs text-dim hover:text-available">
        &lt; volver al mapa
      </Link>
      <p className="mt-4 font-mono text-xs text-available">&gt; sector {String(zone.order).padStart(2, "0")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">
          <span className="mr-2">{zone.emoji}</span>
          {zone.title}
        </h1>
        <StateBadge state={zone.progress.state} />
      </div>
      {zone.story && <p className="mt-3 leading-relaxed text-dim">{zone.story}</p>}

      <div className="mt-4">
        <div className="mb-1 flex justify-between font-mono text-xs text-dim">
          <span>progreso del sector</span>
          <span>{zone.progress.percent} %</span>
        </div>
        <ProgressBar percent={zone.progress.percent} state={zone.progress.state} />
      </div>

      {!zone.progress.unlocked && zone.prereqs.length > 0 && (
        <div className="mt-5 rounded-md border border-locked bg-surface p-4 text-sm">
          <p className="font-mono text-xs text-dim">acceso denegado · requiere</p>
          <ul className="mt-2 space-y-1">
            {zone.prereqs.map((p) => (
              <li key={p.zoneSlug} className={p.met ? "text-done" : "text-ink"}>
                {p.met ? "✓" : "○"}{" "}
                <Link href={`/zone/${p.zoneSlug}`} className="underline decoration-dotted hover:text-available">
                  {p.zoneTitle}
                </Link>{" "}
                — nivel {p.level}
              </li>
            ))}
          </ul>
        </div>
      )}
      {zone.status === "outline" && (
        <p className="mt-5 rounded-md border border-dashed border-locked p-4 text-sm text-dim">
          Este sector todavía está en esqueleto: verás sus niveles, pero el contenido llega más adelante.
        </p>
      )}

      {/* Etapas verticales */}
      <ol className="relative mt-8 space-y-4 border-l border-line pl-6">
        {levels.map((l) => {
          const st = l.progress.state;
          const color = STATE_COLOR[st];
          const clickable = true;
          const body = (
            <>
              <span
                aria-hidden
                className="absolute -left-[31px] top-4 flex h-4 w-4 rotate-45 items-center justify-center border-2 bg-bg"
                style={{ borderColor: color, background: st === "completed" ? color : undefined }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs" style={{ color }}>
                  nivel {l.number} · {RANK[l.number]}
                </p>
                <StateBadge state={st} />
              </div>
              <h2 className="mt-1 text-xl font-semibold">{l.title}</h2>
              {l.story && <p className="mt-1 text-sm text-dim">{l.story}</p>}
              {l.progress.requiredTotal > 0 && (
                <p className="mt-2 font-mono text-xs text-dim">
                  {l.progress.requiredDone}/{l.progress.requiredTotal} quests obligatorias
                </p>
              )}
            </>
          );
          return (
            <li key={l.id} className="relative">
              {clickable ? (
                <Link
                  href={`/level/${l.slug}`}
                  className={`block rounded-md border bg-surface p-4 transition-colors hover:border-available ${st === "outline" ? "border-dashed border-line opacity-70" : "border-line"}`}
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-md border border-dashed border-line bg-surface/50 p-4 opacity-70">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
