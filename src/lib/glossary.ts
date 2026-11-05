import "server-only";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import type { Card } from "@/components/Flashcards";

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
    .where(and(lte(s.glossarySrs.dueAt, new Date()), eq(s.glossaryTerms.status, "published")))
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
    .where(and(isNull(s.glossarySrs.termId), eq(s.glossaryTerms.status, "published")))
    .orderBy(asc(s.glossaryTerms.id))
    .limit(limit);
  return rows.map((r) => toCard(r.t));
}
