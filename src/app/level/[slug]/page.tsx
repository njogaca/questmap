import Link from "next/link";
import { notFound } from "next/navigation";
import { StateBadge } from "@/components/StateBadge";
import { QUEST_STATE_TEXT, QUEST_TYPE_TEXT } from "@/components/state";
import type { NodeState, QuestState } from "@/lib/progress";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "aprender", label: "Aprender", types: ["learn"] },
  { key: "glosario", label: "Glosario", types: ["glossary", "micro"] },
  { key: "practica", label: "Práctica", types: ["lab", "open_answer", "interview"] },
  { key: "quiz", label: "Quiz", types: ["quiz"] },
  { key: "jefe", label: "Jefe", types: ["boss"] },
] as const;

const QUEST_TO_NODE: Record<QuestState, NodeState> = {
  locked: "locked",
  available: "available",
  in_progress: "in_progress",
  completed: "completed",
};

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const world = await loadWorld();
  const level = world.levels.find((l) => l.slug === slug);
  if (!level) notFound();
  const zone = world.zones.find((z) => z.id === level.zoneId)!;
  const quests = world.quests.filter((q) => q.levelId === level.id).sort((a, b) => a.order - b.order);

  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, quests.filter((q) => (t.types as readonly string[]).includes(q.type)).length]),
  );
  const activeKey = TABS.find((t) => t.key === tab)?.key ?? TABS.find((t) => counts[t.key] > 0)?.key ?? "aprender";
  const active = TABS.find((t) => t.key === activeKey)!;
  const visible = quests.filter((q) => (active.types as readonly string[]).includes(q.type));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href={`/zone/${zone.slug}`} className="font-mono text-xs text-dim hover:text-available">
        &lt; {zone.emoji} {zone.title}
      </Link>
      <p className="mt-4 font-mono text-xs text-available">&gt; nivel {level.number}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{level.title}</h1>
        <StateBadge state={level.progress.state} />
      </div>
      {level.story && <p className="mt-3 leading-relaxed text-dim">{level.story}</p>}

      {!level.progress.unlocked && level.status !== "outline" && (
        <p className="mt-4 rounded-md border border-locked bg-surface p-3 text-sm text-dim">
          Nodo bloqueado. Completa el nivel anterior{zone.progress.unlocked ? "" : " y los requisitos del sector"} para entrar.
        </p>
      )}

      {/* Pestañas */}
      <nav className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line" aria-label="Secciones del nivel">
        {TABS.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <Link
              key={t.key}
              href={`/level/${level.slug}?tab=${t.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-mono text-sm transition-colors ${
                isActive ? "border-available text-available" : "border-transparent text-dim hover:text-ink"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-70">{counts[t.key]}</span>
            </Link>
          );
        })}
      </nav>

      <ul className="mt-4 space-y-2">
        {visible.length === 0 && <li className="text-sm text-dim">No hay quests en esta sección.</li>}
        {visible.map((q) => {
          const locked = q.state === "locked";
          return (
            <li key={q.id}>
              <Link
                href={`/quest/${q.slug}`}
                className={`flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3 transition-colors ${
                  locked ? "opacity-60" : "hover:border-available"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-dim">
                    {QUEST_TYPE_TEXT[q.type] ?? q.type} · {q.estimatedMin} min · {q.xp} XP
                    {!q.required && " · opcional"}
                  </p>
                  <p className="mt-0.5 truncate">{q.title}</p>
                </div>
                <StateBadge state={QUEST_TO_NODE[q.state]} label={QUEST_STATE_TEXT[q.state]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
