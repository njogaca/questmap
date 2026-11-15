import "server-only";
import { cache } from "react";
import { asc, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db/client";

export type Track = typeof s.tracks.$inferSelect;

/**
 * Rutas de estudio. Recordatorio de la regla del esquema: en `zones`, `skills`, `xp_events`
 * y `study_log`, un `track_id` NULL significa TRANSVERSAL, es decir que vale para todas las rutas.
 */
export const listTracks = cache(async (): Promise<Track[]> =>
  db.select().from(s.tracks).where(ne(s.tracks.status, "archived")).orderBy(asc(s.tracks.order)),
);

/**
 * La ruta que estoy cursando. Si el perfil no apunta a ninguna (base recién migrada, o la ruta
 * quedó archivada), cae a la primera publicada para que la app nunca se quede sin mundo.
 */
export const getActiveTrack = cache(async (): Promise<Track | null> => {
  const [p] = await db
    .select({ activeTrackId: s.profile.activeTrackId })
    .from(s.profile)
    .where(eq(s.profile.id, 1));

  const tracks = await listTracks();
  if (p?.activeTrackId) {
    const current = tracks.find((t) => t.id === p.activeTrackId);
    if (current) return current;
  }
  return tracks[0] ?? null;
});

/** Id de la ruta activa, o null si todavía no hay ninguna ruta creada. */
export const getActiveTrackId = cache(async (): Promise<number | null> => (await getActiveTrack())?.id ?? null);

export async function setActiveTrack(trackId: number) {
  await db
    .insert(s.profile)
    .values({ id: 1, activeTrackId: trackId })
    .onConflictDoUpdate({ target: s.profile.id, set: { activeTrackId: trackId } });
}

/** XP acumulado por ruta. El XP transversal no se atribuye a ninguna y por eso no aparece aquí. */
export const getTrackXp = cache(async (): Promise<Map<number, number>> => {
  const rows = await db.select().from(s.trackProgress);
  return new Map(rows.map((r) => [r.trackId, r.xpTotal]));
});

export type TrackOverview = Track & {
  xp: number;
  zonesPublished: number;
  zonesOutline: number;
  questsPublished: number;
  questsCompleted: number;
  /** Zonas transversales que esta ruta hereda (inglés, entrevistas, Linux). */
  sharedZones: number;
};

/**
 * Resumen para el selector de rutas. El contenido en `outline` se cuenta aparte a propósito:
 * una ruta a medio escribir debe verse a medio escribir, no inflar su progreso.
 */
export const loadTracksOverview = cache(async (): Promise<TrackOverview[]> => {
  const [tracks, zones, levels, quests, progress, xp] = await Promise.all([
    listTracks(),
    db.select({ id: s.zones.id, trackId: s.zones.trackId, status: s.zones.status }).from(s.zones),
    db.select({ id: s.levels.id, zoneId: s.levels.zoneId, status: s.levels.status }).from(s.levels),
    db
      .select({ id: s.quests.id, levelId: s.quests.levelId, status: s.quests.status, required: s.quests.required })
      .from(s.quests),
    db.select({ questId: s.questProgress.questId, status: s.questProgress.status }).from(s.questProgress),
    getTrackXp(),
  ]);

  const completed = new Set(progress.filter((p) => p.status === "completed").map((p) => p.questId));
  const zoneOf = new Map(levels.map((l) => [l.id, l.zoneId]));
  const trackOfZone = new Map(zones.map((z) => [z.id, z.trackId]));
  const zoneStatus = new Map(zones.map((z) => [z.id, z.status]));
  const sharedZones = zones.filter((z) => z.trackId === null && z.status !== "archived").length;

  return tracks.map((t) => {
    const mine = zones.filter((z) => z.trackId === t.id && z.status !== "archived");
    const myQuests = quests.filter((q) => {
      const zid = zoneOf.get(q.levelId);
      if (zid === undefined || trackOfZone.get(zid) !== t.id) return false;
      return q.status === "published" && zoneStatus.get(zid) === "published";
    });
    return {
      ...t,
      xp: xp.get(t.id) ?? 0,
      zonesPublished: mine.filter((z) => z.status === "published").length,
      zonesOutline: mine.filter((z) => z.status === "outline").length,
      questsPublished: myQuests.length,
      questsCompleted: myQuests.filter((q) => completed.has(q.id)).length,
      sharedZones,
    };
  });
});
