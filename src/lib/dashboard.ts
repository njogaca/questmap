import "server-only";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { openReviewItems } from "./claude/service";
import { getStreak, getXpTotal } from "./game";
import { dueCount, newCards } from "./glossary";
import { computeReadiness } from "./readiness";
import { addDays, localDate, localWeekday, weekStart } from "./time";
import { rankFor } from "./xp";
import { loadWorld, type World, type WorldQuest } from "./world";

export type Recommendation = {
  slug: string;
  title: string;
  type: string;
  estimatedMin: number;
  xp: number;
  zoneTitle: string;
  zoneEmoji: string | null;
  levelNumber: number;
  reason?: string;
};

function toRec(world: World, q: WorldQuest, reason?: string): Recommendation {
  const level = world.levels.find((l) => l.id === q.levelId)!;
  const zone = world.zones.find((z) => z.id === level.zoneId)!;
  return {
    slug: q.slug,
    title: q.title,
    type: q.type,
    estimatedMin: q.estimatedMin,
    xp: q.xp,
    zoneTitle: zone.title,
    zoneEmoji: zone.emoji,
    levelNumber: level.number,
    reason,
  };
}

/** Quests abiertas ordenadas: en progreso primero, luego obligatorias, luego por zona/nivel/orden. */
function openQuests(world: World, filter: (q: WorldQuest) => boolean = () => true) {
  const levelOf = new Map(world.levels.map((l) => [l.id, l]));
  const zoneOf = new Map(world.zones.map((z) => [z.id, z]));
  return world.quests
    .filter((q) => q.status === "published" && (q.state === "available" || q.state === "in_progress") && filter(q))
    .sort((a, b) => {
      const la = levelOf.get(a.levelId)!;
      const lb = levelOf.get(b.levelId)!;
      const za = zoneOf.get(la.zoneId)!;
      const zb = zoneOf.get(lb.zoneId)!;
      return (
        Number(b.state === "in_progress") - Number(a.state === "in_progress") ||
        Number(b.required) - Number(a.required) ||
        za.order - zb.order ||
        la.number - lb.number ||
        a.order - b.order
      );
    });
}

export async function loadDashboard() {
  const today = localDate();
  const weekday = localWeekday();
  const world = await loadWorld();

  const [skills, progress, xpTotal, streak, due, fresh, badges, weekly, reviews] = await Promise.all([
    db.select().from(s.skills).where(eq(s.skills.status, "published")).orderBy(asc(s.skills.order)),
    db.select().from(s.questProgress),
    getXpTotal(),
    getStreak(),
    dueCount(),
    newCards(10),
    db
      .select({ title: s.badges.title, icon: s.badges.icon, awardedAt: s.userBadges.awardedAt })
      .from(s.userBadges)
      .innerJoin(s.badges, eq(s.badges.id, s.userBadges.badgeId))
      .orderBy(desc(s.userBadges.awardedAt)),
    db
      .select({ date: s.studyLog.date, minutes: sql<number>`sum(${s.studyLog.minutes})::int` })
      .from(s.studyLog)
      .where(gte(s.studyLog.date, addDays(weekStart(today), -7 * 7)))
      .groupBy(s.studyLog.date),
    openReviewItems(5),
  ]);

  const readiness = computeReadiness(
    skills.map((sk) => ({ code: sk.code, name: sk.name, core: sk.core, targetXp: sk.targetXp })),
    world.quests.map((q) => ({ id: q.id, xp: q.xp, status: q.status, skills: q.skills })),
    progress.map((p) => ({ questId: p.questId, completed: p.status === "completed", xpAwarded: p.xpAwarded })),
  );

  // Horas por semana (8 semanas, lunes–domingo)
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -7 * (7 - i)));
  const weeklyMinutes = weeks.map((w) => ({
    weekStart: w,
    minutes: weekly.filter((r) => r.date >= w && r.date < addDays(w, 7)).reduce((a, r) => a + r.minutes, 0),
  }));

  // Daily Quest
  const nextQuest = openQuests(world)[0];
  const englishMicro = openQuests(world, (q) => q.type === "micro" && q.skills.some((sk) => sk.code === "english"))[0];

  // Siguientes acciones: una por skill core debajo del umbral (la más baja primero)
  const actions: Recommendation[] = [];
  const used = new Set<string>();
  for (const sk of [...readiness.coreBelow].sort((a, b) => a.readiness - b.readiness)) {
    const q = openQuests(world, (x) => x.skills.some((y) => y.code === sk.code) && !used.has(x.slug))[0];
    if (q) {
      used.add(q.slug);
      actions.push(toRec(world, q, `${sk.name}: ${sk.readiness} %`));
    }
    if (actions.length >= 3) break;
  }
  for (const q of openQuests(world, (x) => !used.has(x.slug))) {
    if (actions.length >= 3) break;
    used.add(q.slug);
    actions.push(toRec(world, q));
  }

  const coreBelowWithNext = readiness.coreBelow.map((sk) => {
    const q = openQuests(world, (x) => x.skills.some((y) => y.code === sk.code))[0];
    return { ...sk, next: q ? toRec(world, q) : null };
  });

  return {
    today,
    isThursday: weekday === 4,
    xpTotal,
    rank: rankFor(xpTotal),
    streak,
    readiness,
    coreBelowWithNext,
    weeklyMinutes,
    badges,
    daily: {
      dueCards: due,
      newCards: fresh.length,
      english: englishMicro ? toRec(world, englishMicro) : null,
      next: nextQuest ? toRec(world, nextQuest) : null,
      reviews: reviews.map((r) => ({ id: r.id, topic: r.topic })),
    },
    actions,
  };
}
