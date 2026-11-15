import "server-only";
import { cache } from "react";
import { asc, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { computeProgress, type LevelOut, type NodeState, type QuestState, type ZoneOut } from "./progress";

export type WorldZone = {
  id: number;
  slug: string;
  title: string;
  order: number;
  emoji: string | null;
  story: string | null;
  skills: string[];
  status: string;
  mapX: number;
  mapY: number;
  prereqs: { zoneSlug: string; zoneTitle: string; level: number; met: boolean }[];
  progress: ZoneOut;
};
export type WorldLevel = {
  id: number;
  slug: string;
  zoneId: number;
  number: number;
  title: string;
  story: string | null;
  status: string;
  progress: LevelOut;
};
export type WorldQuest = {
  id: number;
  slug: string;
  levelId: number;
  type: string;
  title: string;
  order: number;
  required: boolean;
  xp: number;
  estimatedMin: number;
  payload: Record<string, unknown>;
  status: string;
  state: QuestState;
  skills: { code: string; weight: number }[];
};

/** Carga todo el mundo (contenido + progreso) y calcula estados. El volumen es pequeño. */
/** Carga el mundo completo. Cacheado por petición: el HUD del layout y la página comparten una sola consulta. */
export const loadWorld = cache(loadWorldUncached);

async function loadWorldUncached() {
  const [zones, levels, quests, prereqs, progress, questSkills, skills] = await Promise.all([
    db.select().from(s.zones).where(ne(s.zones.status, "archived")).orderBy(asc(s.zones.order)),
    db.select().from(s.levels).where(ne(s.levels.status, "archived")).orderBy(asc(s.levels.number)),
    db.select().from(s.quests).where(ne(s.quests.status, "archived")).orderBy(asc(s.quests.order)),
    db.select().from(s.zonePrerequisites),
    db.select({ questId: s.questProgress.questId, status: s.questProgress.status }).from(s.questProgress),
    db.select().from(s.questSkills),
    db.select({ id: s.skills.id, code: s.skills.code, name: s.skills.name }).from(s.skills),
  ]);

  const computed = computeProgress({ zones, levels, quests, prereqs, progress });
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const skillCodeById = new Map(skills.map((sk) => [sk.id, sk.code]));

  const worldZones: WorldZone[] = zones.map((z, i) => {
    const p = computed.zones.get(z.id)!;
    return {
      id: z.id,
      slug: z.slug,
      title: z.title,
      order: z.order,
      emoji: z.emoji,
      story: z.story,
      skills: z.skills,
      status: z.status,
      mapX: z.mapX ?? 100 + (i % 5) * 200,
      mapY: z.mapY ?? 160 + Math.floor(i / 5) * 300,
      prereqs: prereqs
        .filter((pr) => pr.zoneId === z.id)
        .map((pr) => ({
          zoneSlug: zoneById.get(pr.requiresZoneId)?.slug ?? "?",
          zoneTitle: zoneById.get(pr.requiresZoneId)?.title ?? "?",
          level: pr.requiresLevelNumber,
          met: !p.missingPrereqs.some((m) => m.requiresZoneId === pr.requiresZoneId),
        })),
      progress: p,
    };
  });

  const worldLevels: WorldLevel[] = levels.map((l) => ({
    id: l.id,
    slug: l.slug,
    zoneId: l.zoneId,
    number: l.number,
    title: l.title,
    story: l.story,
    status: l.status,
    progress: computed.levels.get(l.id)!,
  }));

  const worldQuests: WorldQuest[] = quests.map((q) => ({
    id: q.id,
    slug: q.slug,
    levelId: q.levelId,
    type: q.type,
    title: q.title,
    order: q.order,
    required: q.required,
    xp: q.xp,
    estimatedMin: q.estimatedMin,
    payload: q.payload,
    status: q.status,
    state: computed.quests.get(q.id) ?? "locked",
    skills: questSkills
      .filter((qs) => qs.questId === q.id)
      .map((qs) => ({ code: skillCodeById.get(qs.skillId) ?? "?", weight: qs.weight })),
  }));

  return {
    zones: worldZones,
    levels: worldLevels,
    quests: worldQuests,
    prereqEdges: prereqs.map((p) => ({ from: p.requiresZoneId, to: p.zoneId, level: p.requiresLevelNumber })),
    skillNames: new Map(skills.map((sk) => [sk.code, sk.name])),
  };
}

export type World = Awaited<ReturnType<typeof loadWorld>>;

export const STATE_LABEL: Record<NodeState, string> = {
  locked: "Bloqueado",
  available: "Disponible",
  in_progress: "En progreso",
  completed: "Completado",
  outline: "Próximamente",
};
