import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { DAILY_MISSIONS, DAILY_REVIEW_MIN_CARDS, EFFORT_TRACK_SLUG, effortXp, type DailyMissionKey } from "./rules";
import { computeStreak } from "./streak";
import { localDate } from "./time";
import { getActiveTrack } from "./track";
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

/** Id de la ruta de esfuerzo si es la que está activa; null en cualquier otro caso. */
async function activeEffortTrackId(): Promise<number | null> {
  const t = await getActiveTrack();
  return t?.slug === EFFORT_TRACK_SLUG ? t.id : null;
}

/** ¿La zona pertenece a la ruta de esfuerzo? (puntos solo por horas y commits, sin bonos) */
async function isEffortZone(zoneId: number): Promise<boolean> {
  const [row] = await db
    .select({ slug: s.tracks.slug })
    .from(s.zones)
    .innerJoin(s.tracks, eq(s.tracks.id, s.zones.trackId))
    .where(eq(s.zones.id, zoneId));
  return row?.slug === EFFORT_TRACK_SLUG;
}

/**
 * `trackOverride` atribuye el XP a una ruta cuando no nace de una quest (minutos anotados a
 * mano, misiones diarias). Sin él, el XP sin quest es transversal, como siempre.
 */
async function addXp(
  tx: Exec,
  amount: number,
  reason: string,
  questId: number | null = null,
  trackOverride?: number | null,
) {
  if (amount <= 0) return;
  const trackId = trackOverride !== undefined ? trackOverride : await trackOfQuest(tx, questId);
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
  opts: {
    hintsUsed?: number;
    quizScore?: number;
    notes?: string;
    evidence?: string;
    logMinutes?: boolean;
    /** XP base a usar en lugar del de la quest (lab entregado con horas pero sin commit = 0). */
    baseXpOverride?: number;
  } = {},
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
  const baseXp = opts.baseXpOverride ?? quest.xp;
  const xp = questXpAwarded({ baseXp, type: quest.type, hintsUsed, quizScore: opts.quizScore });
  const reward = emptyReward();
  // Ruta de esfuerzo: completar un nivel o un mundo no da puntos por sí mismo.
  const effort = await isEffortZone(zone.id);
  const levelBonus = effort ? 0 : LEVEL_BONUS_XP;
  const zoneBonus = effort ? 0 : ZONE_BONUS_XP;
  const plus = (n: number) => (n > 0 ? ` (+${n} XP)` : "");

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
    reward.messages.push(
      xp > 0 ? `+${xp} XP · ${quest.title}${hintsUsed > 0 ? " (−20 % por pistas)" : ""}` : `Hecho · ${quest.title}`,
    );
    if (opts.logMinutes !== false) reward.badges.push(...(await logStudy(quest.estimatedMin, `quest:${quest.slug}`, quest.id, tx)));
  });

  // Bonos de nivel / zona: comparar el mundo antes y después.
  const after = await loadWorld();
  const levelAfter = after.levels.find((l) => l.id === level.id)!;
  const zoneAfter = after.zones.find((z) => z.id === zone.id)!;
  if (!level.progress.completed && levelAfter.progress.completed) {
    await addXp(db, levelBonus, `level:${level.slug}`);
    reward.xp += levelBonus;
    reward.messages.push(`Nodo comprometido: nivel ${level.number} de ${zone.title}${plus(levelBonus)}`);
    const next = after.levels.find((l) => l.zoneId === zone.id && l.number === level.number + 1);
    if (next && next.progress.unlocked) reward.messages.push(`Desbloqueado: ${next.title}`);
    for (const z of after.zones) {
      const prev = before.zones.find((b) => b.id === z.id);
      if (prev && !prev.progress.unlocked && z.progress.unlocked) reward.messages.push(`Nuevo sector abierto: ${z.title}`);
    }
  }
  if (zone.progress.state !== "completed" && zoneAfter.progress.state === "completed") {
    await addXp(db, zoneBonus, `zone:${zone.slug}`);
    reward.xp += zoneBonus;
    reward.messages.push(`¡Sector ${zone.title} completado!${plus(zoneBonus)}`);
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
  // En la ruta de esfuerzo repasar glosario no da puntos (los minutos sí cuentan para la racha).
  const effortActive = (await activeEffortTrackId()) !== null;
  if (!effortActive && !already && cardsReviewed >= DAILY_REVIEW_MIN_CARDS) {
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

/* ------------------------------------------------- horas y misiones diarias */

/**
 * Minutos que el usuario anota a mano (no los estimados que la app registra sola al completar
 * una quest). Siempre cuentan para la racha; en la ruta de esfuerzo además dan puntos.
 */
export async function logEffort(minutes: number, activity: string, questId: number | null = null): Promise<Reward> {
  const reward = emptyReward();
  const m = Math.max(0, Math.round(minutes));
  if (m === 0) return reward;
  reward.badges.push(...(await logStudy(m, activity, questId)));
  reward.messages.push(`${m} min anotados`);
  const trackId = await activeEffortTrackId();
  if (trackId !== null) {
    const xp = effortXp(m);
    const xpBefore = await getXpTotal();
    await addXp(db, xp, `hours:${activity}`, questId, trackId);
    reward.xp = xp;
    if (xp > 0) reward.messages.push(`+${xp} XP por horas hechas`);
    const rAfter = rankFor(xpBefore + xp);
    if (rAfter.index > rankFor(xpBefore).index) reward.rankUp = rAfter.name;
  }
  return reward;
}

const dailyActivity = (key: DailyMissionKey) => `daily:${key}`;
const dailyMarker = (key: DailyMissionKey, day: string) => `daily:${key}:${day}`;

/**
 * Qué misiones diarias están hechas hoy (fecha local). Las que llevan minutos se leen de
 * `study_log`; las que solo se marcan (gimnasio) dejan un evento de 0 puntos en `xp_events`,
 * el mismo patrón que usa el repaso diario de glosario. Así no hace falta una tabla nueva.
 */
export async function dailyMissionsDone(): Promise<Set<DailyMissionKey>> {
  const today = localDate();
  const [logs, marks] = await Promise.all([
    db.select({ activity: s.studyLog.activity }).from(s.studyLog).where(eq(s.studyLog.date, today)),
    db.select({ reason: s.xpEvents.reason }).from(s.xpEvents).where(sql`${s.xpEvents.reason} like ${`daily:%:${today}`}`),
  ]);
  const done = new Set<DailyMissionKey>();
  for (const m of DAILY_MISSIONS) {
    if (logs.some((l) => l.activity === dailyActivity(m.key))) done.add(m.key);
    if (marks.some((x) => x.reason === dailyMarker(m.key, today))) done.add(m.key);
  }
  return done;
}

/** Marca una misión diaria como hecha (una vez por día local). */
export async function completeDailyMission(key: DailyMissionKey): Promise<Reward> {
  const mission = DAILY_MISSIONS.find((m) => m.key === key);
  if (!mission) throw new Error("Misión desconocida.");
  if ((await dailyMissionsDone()).has(key)) return { ...emptyReward(), messages: ["Ya la habías marcado hoy."] };
  if (mission.minutes > 0) return logEffort(mission.minutes, dailyActivity(key));
  await db.insert(s.xpEvents).values({ amount: 0, reason: dailyMarker(key, localDate()), questId: null, trackId: null });
  return { ...emptyReward(), messages: [`${mission.label}: hecho`] };
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
