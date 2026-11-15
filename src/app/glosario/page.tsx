import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema as s } from "@/db/client";
import { GlossaryBrowser } from "@/components/GlossaryBrowser";
import { btnPrimary } from "@/components/ui";
import { activeTrackTerms, dueCount } from "@/lib/glossary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Glosario" };

export default async function GlossaryPage() {
  const [terms, srs, zones, due] = await Promise.all([
    // Mismo recorte que la micro-quest diaria: el glosario que ves es el de tu ruta.
    db
      .select()
      .from(s.glossaryTerms)
      .where(and(eq(s.glossaryTerms.status, "published"), await activeTrackTerms()))
      .orderBy(asc(s.glossaryTerms.term)),
    db.select().from(s.glossarySrs),
    db.select({ slug: s.zones.slug, title: s.zones.title }).from(s.zones),
    dueCount(),
  ]);
  const srsBy = new Map(srs.map((x) => [x.termId, x]));
  const zoneTitle = new Map(zones.map((z) => [z.slug, z.title]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="font-mono text-xs text-available">&gt; questmap://glosario</p>
      <h1 className="mt-1 text-3xl font-bold">Glosario</h1>
      <p className="mt-1 text-sm text-dim">
        Términos en inglés como aparecen en entrevistas, con definición en español simple, un ejemplo y una analogía para recordarlos.
      </p>

      <div className="hud-panel hud-corners mt-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <p className="font-title text-2xl text-available">{due}</p>
          <p className="text-sm text-dim">tarjetas para repasar hoy</p>
        </div>
        <Link href="/glosario/repaso" className={btnPrimary}>
          &gt; modo flashcards
        </Link>
      </div>

      <div className="mt-6">
        <GlossaryBrowser
          rows={terms.map((t) => ({
            id: t.id,
            term: t.term,
            zoneSlug: t.zoneSlug,
            zoneTitle: t.zoneSlug ? (zoneTitle.get(t.zoneSlug) ?? t.zoneSlug) : null,
            category: t.category,
            definitionEs: t.definitionEs,
            definitionEn: t.definitionEn,
            exampleEn: t.exampleEn,
            analogy: t.analogy,
            analogyMq: t.analogyMq,
            seeAlso: t.seeAlso,
            nextReview: srsBy.get(t.id)?.dueAt.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}
