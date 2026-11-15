import "server-only";
import { cache } from "react";
import { and, asc, eq, isNotNull, isNull, lte, ne, notInArray, or, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import type { Card } from "@/components/Flashcards";
import { getActiveTrackId } from "./track";

/**
 * Condición para que un término pertenezca a la ruta que estoy cursando.
 *
 * Se expresa por exclusión —fuera los términos de zonas de OTRAS rutas— y no por inclusión,
 * porque así entran solos los tres casos que deben entrar: zona de esta ruta, zona transversal
 * (inglés, Linux) y término sin zona o con una zona que ya no existe. Sin esto, la micro-quest
 * diaria mezclaría el vocabulario de todas las rutas en una sola baraja.
 */
export const activeTrackTerms = cache(async (): Promise<SQL | undefined> => {
  const trackId = await getActiveTrackId();
  if (trackId === null) return undefined;
  const foreign = await db
    .select({ slug: s.zones.slug })
    .from(s.zones)
    .where(and(isNotNull(s.zones.trackId), ne(s.zones.trackId, trackId)));
  if (foreign.length === 0) return undefined;
  const slugs = foreign.map((z) => z.slug);
  return or(isNull(s.glossaryTerms.zoneSlug), notInArray(s.glossaryTerms.zoneSlug, slugs));
});

const toCard = (t: typeof s.glossaryTerms.$inferSelect): Card => ({
  id: t.id,
  term: t.term,
  category: t.category,
  definitionEs: t.definitionEs,
  definitionEn: t.definitionEn,
  exampleEn: t.exampleEn,
  analogy: t.analogy,
  analogyMq: t.analogyMq,
});

/** Tarjetas vencidas (ya estudiadas alguna vez y con due_at ≤ ahora). */
export async function dueCards(limit = 30): Promise<Card[]> {
  const rows = await db
    .select({ t: s.glossaryTerms })
    .from(s.glossarySrs)
    .innerJoin(s.glossaryTerms, eq(s.glossaryTerms.id, s.glossarySrs.termId))
    .where(and(lte(s.glossarySrs.dueAt, new Date()), eq(s.glossaryTerms.status, "published"), await activeTrackTerms()))
    .orderBy(asc(s.glossarySrs.dueAt))
    .limit(limit);
  return rows.map((r) => toCard(r.t));
}

export async function dueCount(): Promise<number> {
  return (await dueCards(500)).length;
}

/** Términos que nunca has estudiado. */
export async function newCards(limit = 10): Promise<Card[]> {
  const rows = await db
    .select({ t: s.glossaryTerms })
    .from(s.glossaryTerms)
    .leftJoin(s.glossarySrs, eq(s.glossarySrs.termId, s.glossaryTerms.id))
    .where(and(isNull(s.glossarySrs.termId), eq(s.glossaryTerms.status, "published"), await activeTrackTerms()))
    .orderBy(asc(s.glossaryTerms.id))
    .limit(limit);
  return rows.map((r) => toCard(r.t));
}
