/**
 * Seed idempotente: carga content/ en las tablas de CONTENIDO con upsert por slug.
 * - Correrlo N veces da el mismo resultado (no duplica nada).
 * - NUNCA borra ni modifica tablas de progreso (solo crea la fila única de `profile` si no existe).
 * - Lo que desaparece del YAML se marca `archived`, no se elimina.
 */
import { and, eq, inArray, notInArray, ne, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadContent } from "../src/content/load";
import { DEFAULT_ESTIMATED_MIN, QUEST_XP } from "../src/content/schema";
import * as s from "../src/db/schema";

type Tx = Parameters<Parameters<NodePgDatabase<typeof s>["transaction"]>[0]>[0];

const FIXED_BADGES = [
  { slug: "badge-streak-7", title: "Racha de 7 días", description: "Estudiaste 7 días seguidos.", icon: "flame" },
  { slug: "badge-streak-30", title: "Racha de 30 días", description: "Estudiaste 30 días seguidos.", icon: "flame" },
  { slug: "badge-first-perfect-quiz", title: "Primer quiz perfecto", description: "100 % en un quiz.", icon: "target" },
  { slug: "badge-first-interview", title: "Primera entrevista aprobada", description: "Aprobaste tu primera simulación.", icon: "mic" },
  { slug: "badge-first-lab-no-hints", title: "Primer lab sin pistas", description: "Completaste un lab sin ver pistas.", icon: "terminal" },
];

async function archiveMissing(tx: Tx, table: typeof s.zones | typeof s.levels | typeof s.quests | typeof s.resources | typeof s.glossaryTerms | typeof s.quizQuestions | typeof s.interviewTemplates | typeof s.badges, keep: string[]) {
  const cond = keep.length
    ? and(notInArray(table.slug, keep), ne(table.status, "archived"))
    : ne(table.status, "archived");
  const res = await tx.update(table).set({ status: "archived" }).where(cond).returning({ slug: table.slug });
  return res.length;
}

async function main() {
  const content = loadContent();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: s });
  const stats: Record<string, number> = {};
  const warnings: string[] = [];

  try {
    await db.transaction(async (tx) => {
      /* ---------- skills ---------- */
      const skillIds = new Map<string, number>();
      for (const [i, sk] of content.skills.entries()) {
        const values = {
          code: sk.code,
          name: sk.name,
          description: sk.description ?? null,
          core: sk.core,
          targetXp: sk.target_xp,
          order: i,
          status: "published" as const,
        };
        const [row] = await tx
          .insert(s.skills)
          .values(values)
          .onConflictDoUpdate({ target: s.skills.code, set: values })
          .returning({ id: s.skills.id });
        skillIds.set(sk.code, row.id);
      }
      stats.skills = skillIds.size;

      /* ---------- resources ---------- */
      const resourceIds = new Map<string, number>();
      for (const r of content.resources) {
        const values = {
          slug: r.slug,
          title: r.title,
          type: r.type,
          url: r.url,
          howToFind: r.how_to_find ?? null,
          language: r.language,
          durationMin: r.duration_min ?? null,
          cost: r.cost,
          required: r.required,
          why: r.why ?? null,
          verified: r.verified,
          status: "published" as const,
        };
        const [row] = await tx
          .insert(s.resources)
          .values(values)
          .onConflictDoUpdate({ target: s.resources.slug, set: values })
          .returning({ id: s.resources.id });
        resourceIds.set(r.slug, row.id);
      }
      stats.resources = resourceIds.size;

      /* ---------- zones (primera pasada) ---------- */
      const zoneIds = new Map<string, number>();
      for (const z of content.zones) {
        const values = {
          slug: z.slug,
          title: z.title,
          order: z.order,
          emoji: z.emoji ?? null,
          story: z.story ?? null,
          skills: z.skills,
          unlockedFromStart: z.unlocked_from_start,
          mapX: z.map ? Math.round(z.map.x) : null,
          mapY: z.map ? Math.round(z.map.y) : null,
          status: z.status,
        };
        const [row] = await tx
          .insert(s.zones)
          .values(values)
          .onConflictDoUpdate({ target: s.zones.slug, set: values })
          .returning({ id: s.zones.id });
        zoneIds.set(z.slug, row.id);
      }
      stats.zones = zoneIds.size;

      /* ---------- prerrequisitos (tabla de contenido: se reescribe) ---------- */
      const allZoneIds = [...zoneIds.values()];
      if (allZoneIds.length) await tx.delete(s.zonePrerequisites).where(inArray(s.zonePrerequisites.zoneId, allZoneIds));
      for (const z of content.zones) {
        for (const p of z.prerequisites) {
          await tx.insert(s.zonePrerequisites).values({
            zoneId: zoneIds.get(z.slug)!,
            requiresZoneId: zoneIds.get(p.zone)!,
            requiresLevelNumber: p.level,
          });
        }
      }

      /* ---------- levels, quests, quiz questions ---------- */
      const levelSlugs: string[] = [];
      const questSlugs: string[] = [];
      const questionSlugs: string[] = [];
      const publishedXpBySkill = new Map<string, number>();

      for (const z of content.zones) {
        for (const l of z.levels) {
          const levelStatus = z.status === "outline" ? "outline" : l.status;
          const lv = {
            slug: l.slug,
            zoneId: zoneIds.get(z.slug)!,
            number: l.number,
            title: l.title,
            story: l.story ?? null,
            status: levelStatus,
          };
          const [lrow] = await tx
            .insert(s.levels)
            .values(lv)
            .onConflictDoUpdate({ target: s.levels.slug, set: lv })
            .returning({ id: s.levels.id });
          levelSlugs.push(l.slug);

          for (const [qi, q] of l.quests.entries()) {
            const questStatus = levelStatus === "outline" ? "outline" : q.status;
            const xp = q.xp ?? QUEST_XP[q.type];
            const qv = {
              slug: q.slug,
              levelId: lrow.id,
              type: q.type,
              title: q.title,
              order: qi,
              required: q.required,
              xp,
              estimatedMin: q.estimated_min ?? DEFAULT_ESTIMATED_MIN[q.type],
              payload: q.payload,
              status: questStatus,
            };
            const [qrow] = await tx
              .insert(s.quests)
              .values(qv)
              .onConflictDoUpdate({ target: s.quests.slug, set: qv })
              .returning({ id: s.quests.id });
            questSlugs.push(q.slug);

            await tx.delete(s.questSkills).where(eq(s.questSkills.questId, qrow.id));
            for (const [code, weight] of Object.entries(q.skills)) {
              await tx.insert(s.questSkills).values({ questId: qrow.id, skillId: skillIds.get(code)!, weight });
              if (questStatus === "published" && q.required)
                publishedXpBySkill.set(code, (publishedXpBySkill.get(code) ?? 0) + xp * weight);
            }

            await tx.delete(s.questResources).where(eq(s.questResources.questId, qrow.id));
            for (const [ri, r] of q.resources.entries()) {
              await tx
                .insert(s.questResources)
                .values({ questId: qrow.id, resourceId: resourceIds.get(r.ref)!, required: r.required, order: ri });
            }

            for (const [qqi, qq] of q.questions.entries()) {
              // Recomendado: dar `slug` explícito a cada pregunta para que reordenarlas no cambie su identidad.
              const qslug = qq.slug ?? `${q.slug}-q${qqi + 1}`;
              const { slug: _omit, type, ...rest } = qq;
              const v = {
                slug: qslug,
                questId: qrow.id,
                type,
                order: qqi,
                payload: rest as Record<string, unknown>,
                status: questStatus,
              };
              await tx.insert(s.quizQuestions).values(v).onConflictDoUpdate({ target: s.quizQuestions.slug, set: v });
              questionSlugs.push(qslug);
            }
          }
        }
      }
      stats.levels = levelSlugs.length;
      stats.quests = questSlugs.length;
      stats.quiz_questions = questionSlugs.length;

      /* ---------- glossary ---------- */
      const termSlugs: string[] = [];
      for (const g of content.glossary) {
        for (const t of g.terms) {
          const v = {
            slug: t.slug,
            term: t.term,
            zoneSlug: g.zone ?? null,
            category: t.category ?? null,
            definitionEs: t.definition_es,
            definitionEn: t.definition_en,
            exampleEn: t.example_en ?? null,
            analogy: t.analogy ?? null,
            analogyMq: t.analogy_mq ?? null,
            seeAlso: t.see_also,
            status: "published" as const,
          };
          await tx.insert(s.glossaryTerms).values(v).onConflictDoUpdate({ target: s.glossaryTerms.slug, set: v });
          termSlugs.push(t.slug);
        }
      }
      stats.glossary_terms = termSlugs.length;

      /* ---------- interview templates ---------- */
      const templateSlugs: string[] = [];
      for (const f of content.interviews) {
        for (const t of f.templates) {
          const v = {
            slug: t.slug,
            mode: t.mode,
            title: t.title,
            zoneSlug: t.zone ?? null,
            payload: t.payload,
            status: "published" as const,
          };
          await tx
            .insert(s.interviewTemplates)
            .values(v)
            .onConflictDoUpdate({ target: s.interviewTemplates.slug, set: v });
          templateSlugs.push(t.slug);
        }
      }
      stats.interview_templates = templateSlugs.length;

      /* ---------- badges ---------- */
      const badgeRows = [
        ...content.zones.map((z) => ({
          slug: `badge-zone-${z.slug}`,
          title: `Sector ${z.title}`,
          description: `Completaste la zona ${z.title}.`,
          icon: z.emoji ?? null,
        })),
        ...FIXED_BADGES,
      ];
      for (const b of badgeRows) {
        const v = { ...b, status: "published" as const };
        await tx.insert(s.badges).values(v).onConflictDoUpdate({ target: s.badges.slug, set: v });
      }
      stats.badges = badgeRows.length;

      /* ---------- archivar lo que ya no está en el YAML ---------- */
      const archived =
        (await archiveMissing(tx, s.zones, [...zoneIds.keys()])) +
        (await archiveMissing(tx, s.levels, levelSlugs)) +
        (await archiveMissing(tx, s.quests, questSlugs)) +
        (await archiveMissing(tx, s.quizQuestions, questionSlugs)) +
        (await archiveMissing(tx, s.resources, [...resourceIds.keys()])) +
        (await archiveMissing(tx, s.glossaryTerms, termSlugs)) +
        (await archiveMissing(tx, s.interviewTemplates, templateSlugs)) +
        (await archiveMissing(tx, s.badges, badgeRows.map((b) => b.slug)));
      stats.archived = archived;
      await tx
        .update(s.skills)
        .set({ status: "archived" })
        .where(and(notInArray(s.skills.code, [...skillIds.keys()]), ne(s.skills.status, "archived")));

      /* ---------- profile: crear la fila única si no existe (no toca datos existentes) ---------- */
      await tx.insert(s.profile).values({ id: 1 }).onConflictDoNothing();

      /* ---------- aviso de target_xp ---------- */
      for (const sk of content.skills) {
        const zonesForSkill = content.zones.filter((z) => z.skills.includes(sk.code));
        const fullyPublished =
          zonesForSkill.length > 0 &&
          zonesForSkill.every(
            (z) => z.status === "published" && z.levels.length === 5 && z.levels.every((l) => l.status === "published"),
          );
        const actual = Math.round(publishedXpBySkill.get(sk.code) ?? 0);
        const diff = Math.abs(actual - sk.target_xp) / sk.target_xp;
        if ((fullyPublished && diff > 0.15) || actual > sk.target_xp * 1.15) {
          warnings.push(
            `skill "${sk.code}": XP publicado ${actual} vs target_xp ${sk.target_xp} (${Math.round(diff * 100)} % de diferencia). Ajusta target_xp en content/skills.yaml.`,
          );
        }
      }
    });

    const [{ count }] = (await db.execute(sql`select count(*)::int as count from quest_progress`)).rows as {
      count: number;
    }[];
    console.log("[seed] OK", JSON.stringify(stats), `| quest_progress intacto: ${count} filas`);
    for (const w of warnings) console.warn(`[seed] AVISO ${w}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed] ERROR", err instanceof Error ? err.message : err);
  process.exit(1);
});
