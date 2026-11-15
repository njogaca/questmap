import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { DAILY_REVIEW_MIN_CARDS } from "./rules";
import { computeStreak } from "./streak";
import { localDate } from "./time";
import { DAILY_REVIEW_XP, LEVEL_BONUS_XP, questXpAwarded, rankFor, ZONE_BONUS_XP } from "./xp";
import { loadWorld, type World } from "./world";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

export type Reward = {
  xp: number;
  messages: string[];
  badges: string[];
  rankUp: string | null;
};

const emptyReward = (): Reward => ({ xp: 0, messages: [], badges: [], rankUp: null });

/* ---------------------------------------------------------------- helpers */

export async function getQuestBySlug(slug: string, world?: World) {
  const w = world ?? (await loadWorld());
  const quest = w.quests.find((q) => q.slug === slug);
  if (!quest) throw new Error("Quest no encontrada");
  return { world: w, quest };
}

export function assertUnlocked(state: string) {
  if (state === "locked") throw new Error("Esta quest está bloqueada.");
}

/**
 * Ruta a la que pertenece una quest, vía su zona. Devuelve null para las quests de zonas
 * transversales (Arena, English, Terminal Tundra) y para el XP que no nace de una quest:
 * ese esfuerzo no se le atribuye a ninguna ruta en particular.
 */
async function trackOfQuest(tx: Exec, questId: number | null): Promise<number | null> {
  if (questId === null) return null;
  const [row] = await tx
    .select({ trackId: s.zones.trackId })
    .from(s.quests)
    .innerJoin(s.levels, eq(s.levels.id, s.quests.levelId))
    .innerJoin(s.zones, eq(s.zones.id, s.levels.zoneId))
    .where(eq(s.quests.id, questId));
  return row?.trackId ?? null;
}

async function addXp(tx: Exec, amount: number, reason: string, questId: number | null = null) {
  if (amount <= 0) return;
  const trackId = await trackOfQuest(tx, questId);
  await tx.insert(s.xpEvents).values({ amount, reason, questId, trackId });
  // XP de por vida: suma todo, incluido lo transversal.
  await tx
    .insert(s.profile)
    .values({ id: 1, xpTotal: amount })
    .onConflictDoUpdate({ target: s.profile.id, set: { xpTotal: sql`${s.profile.xpTotal} + ${amount}` } });
  // XP de la ruta: solo lo que se ganó dentro de ella.
  if (trackId !== null) {
    const now = new Date();
    await tx
      .insert(s.trackProgress)
      .values({ trackId, xpTotal: amount, lastActiveAt: now })
      .onConflictDoUpdate({
        target: s.trackProgress.trackId,
        set: { xpTotal: sql`${s.trackProgress.xpTotal} + ${amount}`, lastActiveAt: now },
      });
  }
}

async function awardBadge(tx: Exec, slug: string): Promise<string | null> {
  const [badge] = await tx.select().from(s.badges).where(eq(s.badges.slug, slug));
  if (!badge) return null;
  const inserted = await tx.insert(s.userBadges).values({ badgeId: badge.id }).onConflictDoNothing().returning();
  return inserted.length ? badge.title : null;
}

export async function getXpTotal(tx: Exec = db): Promise<number> {
  const [p] = await tx.select({ xp: s.profile.xpTotal }).from(s.profile).where(eq(s.profile.id, 1));
  return p?.xp ?? 0;
}

/** Registra minutos de estudio en la fecha LOCAL (TZ) y revisa insignias de racha. */
export async function logStudy(minutes: number, activity: string, questId: number | null = null, tx: Exec = db) {
  const m = Math.max(0, Math.round(minutes));
  if (m === 0) return [] as string[];
  // La racha NO se parte por ruta: se deriva de `date`. El `track_id` solo sirve para poder
  // responder después cuántos minutos le diste a cada ruta.
  const trackId = await trackOfQuest(tx, questId);
  await tx.insert(s.studyLog).values({ date: localDate(), minutes: m, activity, questId, trackId });
  return refreshStreak(tx);
}

export async function getStreak(tx: Exec = db) {
  const rows = await tx
    .select({ date: s.studyLog.date, minutes: sql<number>`sum(${s.studyLog.minutes})::int` })
    .from(s.studyLog)
    .groupBy(s.studyLog.date);
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r.minutes]));
  return computeStreak(byDate, localDate());
}

async function refreshStreak(tx: Exec): Promise<string[]> {
  const st = await getStreak(tx);
  await tx
    .update(s.profile)
    .set({ streakCurrentCache: st.current, streakBestCache: st.best })
    .where(eq(s.profile.id, 1));
  const badges: string[] = [];
  if (st.best >= 7) {
    const b = await awardBadge(tx, "badge-streak-7");
    if (b) badges.push(b);
  }
  if (st.best >= 30) {
    const b = await awardBadge(tx, "badge-streak-30");
    if (b) badges.push(b);
  }
  return badges;
}

/** Marca una quest como "en progreso" si todavía no lo está ni está completada. */
export async function markInProgress(questId: number, tx: Exec = db) {
  await tx.insert(s.questProgress).values({ questId, status: "in_progress" }).onConflictDoNothing();
}

/* ------------------------------------------------------------ completar */

/**
 * Completa una quest (idempotente: si ya estaba completada, no da XP de nuevo).
 * Da XP de la quest, +100 al completar un nivel, +300 e insignia al completar una zona.
 */
export async function completeQuest(
  slug: string,
  opts: { hintsUsed?: number; quizScore?: number; notes?: string; evidence?: string; logMinutes?: boolean } = {},
): Promise<Reward> {
  const before = await loadWorld();
  const { quest } = await getQuestBySlug(slug, before);
  assertUnlocked(quest.state);
  if (quest.state === "completed") return { ...emptyReward(), messages: ["Ya habías completado esta quest."] };

  const level = before.levels.find((l) => l.id === quest.levelId)!;
  const zone = before.zones.find((z) => z.id === level.zoneId)!;
  const xpBefore = await getXpTotal();

  const [existing] = await db.select().from(s.questProgress).where(eq(s.questProgress.questId, quest.id));
  const hintsUsed = Math.max(existing?.hintsUsed ?? 0, opts.hintsUsed ?? 0);
  const xp = questXpAwarded({ baseXp: quest.xp, type: quest.type, hintsUsed, quizScore: opts.quizScore });
  const reward = emptyReward();

  await db.transaction(async (tx) => {
    const values = {
      questId: quest.id,
      status: "completed" as const,
      completedAt: new Date(),
      xpAwarded: xp,
      hintsUsed,
      notes: opts.notes ?? existing?.notes ?? null,
      evidence: opts.evidence ?? existing?.evidence ?? null,
    };
    await tx.insert(s.questProgress).values(values).onConflictDoUpdate({ target: s.questProgress.questId, set: values });
    await addXp(tx, xp, `quest:${quest.type}`, quest.id);
    reward.xp += xp;
    reward.messages.push(`+${xp} XP · ${quest.title}${hintsUsed > 0 ? " (−20 % por pistas)" : ""}`);
    if (opts.logMinutes !== false) reward.badges.push(...(await logStudy(quest.estimatedMin, `quest:${quest.slug}`, quest.id, tx)));
  });

  // Bonos de nivel / zona: comparar el mundo antes y después.
  const after = await loadWorld();
  const levelAfter = after.levels.find((l) => l.id === level.id)!;
  const zoneAfter = after.zones.find((z) => z.id === zone.id)!;
  if (!level.progress.completed && levelAfter.progress.completed) {
    await addXp(db, LEVEL_BONUS_XP, `level:${level.slug}`);
    reward.xp += LEVEL_BONUS_XP;
    reward.messages.push(`Nodo comprometido: nivel ${level.number} de ${zone.title} (+${LEVEL_BONUS_XP} XP)`);
    const next = after.levels.find((l) => l.zoneId === zone.id && l.number === level.number + 1);
    if (next && next.progress.unlocked) reward.messages.push(`Desbloqueado: ${next.title}`);
    for (const z of after.zones) {
      const prev = before.zones.find((b) => b.id === z.id);
      if (prev && !prev.progress.unlocked && z.progress.unlocked) reward.messages.push(`Nuevo sector abierto: ${z.title}`);
    }
  }
  if (zone.progress.state !== "completed" && zoneAfter.progress.state === "completed") {
    await addXp(db, ZONE_BONUS_XP, `zone:${zone.slug}`);
    reward.xp += ZONE_BONUS_XP;
    reward.messages.push(`¡Sector ${zone.title} completado! (+${ZONE_BONUS_XP} XP)`);
    const b = await awardBadge(db, `badge-zone-${zone.slug}`);
    if (b) reward.badges.push(b);
  }

  const xpAfter = await getXpTotal();
  const rBefore = rankFor(xpBefore);
  const rAfter = rankFor(xpAfter);
  if (rAfter.index > rBefore.index) reward.rankUp = rAfter.name;
  return reward;
}

/** XP del repaso diario de glosario: una vez por día local. */
export async function grantDailyReview(cardsReviewed: number): Promise<Reward> {
  const reward = emptyReward();
  const minutes = Math.max(1, Math.round(cardsReviewed * 0.5));
  reward.badges.push(...(await logStudy(minutes, "glossary:review")));
  const today = localDate();
  const reason = `daily_review:${today}`;
  const [already] = await db
    .select({ id: s.xpEvents.id })
    .from(s.xpEvents)
    .where(and(eq(s.xpEvents.reason, reason)));
  if (!already && cardsReviewed >= DAILY_REVIEW_MIN_CARDS) {
    const xpBefore = await getXpTotal();
    await addXp(db, DAILY_REVIEW_XP, reason);
    reward.xp = DAILY_REVIEW_XP;
    reward.messages.push(`+${DAILY_REVIEW_XP} XP · repaso diario de glosario`);
    const rAfter = rankFor(xpBefore + DAILY_REVIEW_XP);
    if (rAfter.index > rankFor(xpBefore).index) reward.rankUp = rAfter.name;
  }
  reward.messages.push(`${minutes} min registrados`);
  return reward;
}

export async function awardPerfectQuizBadge() {
  return awardBadge(db, "badge-first-perfect-quiz");
}

export async function awardFirstInterviewBadge() {
  return awardBadge(db, "badge-first-interview");
}

export async function awardFirstLabNoHintsBadge() {
  return awardBadge(db, "badge-first-lab-no-hints");
}
