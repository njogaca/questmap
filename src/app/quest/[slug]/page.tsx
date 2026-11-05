import Link from "next/link";
import { notFound } from "next/navigation";
import { StateBadge } from "@/components/StateBadge";
import { QUEST_STATE_TEXT, QUEST_TYPE_TEXT } from "@/components/state";
import { loadWorld } from "@/lib/world";

export const dynamic = "force-dynamic";

/** Fase 2: ficha de la quest. Las vistas interactivas por tipo llegan en la Fase 3. */
export default async function QuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const world = await loadWorld();
  const quest = world.quests.find((q) => q.slug === slug);
  if (!quest) notFound();
  const level = world.levels.find((l) => l.id === quest.levelId)!;

  const nodeState = quest.state === "completed" ? "completed" : quest.state === "locked" ? "locked" : quest.state;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href={`/level/${level.slug}`} className="font-mono text-xs text-dim hover:text-available">
        &lt; nivel {level.number}: {level.title}
      </Link>
      <p className="mt-4 font-mono text-xs text-available">&gt; quest · {QUEST_TYPE_TEXT[quest.type] ?? quest.type}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{quest.title}</h1>
        <StateBadge state={nodeState} label={QUEST_STATE_TEXT[quest.state]} />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {(
          [
            ["XP", quest.xp],
            ["Tiempo", `${quest.estimatedMin} min`],
            ["Tipo", quest.required ? "Obligatoria" : "Opcional"],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-md bg-surface p-3">
            <dt className="font-mono text-xs text-dim">{k}</dt>
            <dd className="font-title text-xl">{v}</dd>
          </div>
        ))}
      </dl>

      {quest.skills.length > 0 && (
        <p className="mt-4 text-sm text-dim">
          Entrena:{" "}
          {quest.skills.map((s) => `${world.skillNames.get(s.code) ?? s.code} (${Math.round(s.weight * 100)} %)`).join(", ")}
        </p>
      )}

      <div className="mt-6 rounded-md border border-dashed border-line bg-surface p-4 text-sm text-dim">
        {quest.state === "locked"
          ? "Esta quest está bloqueada: completa los niveles anteriores para acceder."
          : "La vista interactiva de esta quest (recursos, flashcards, quiz…) llega en la Fase 3."}
      </div>
    </main>
  );
}
