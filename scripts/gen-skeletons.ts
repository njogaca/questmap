/**
 * Agrega quests ESQUELETO (sin contenido) a los niveles `outline` que aún no tienen quests.
 * Se ven en el nivel como "próximamente" y content:new los reemplaza por el nivel completo.
 *
 *   npx tsx scripts/gen-skeletons.ts
 * Idempotente: no toca niveles que ya tienen quests ni niveles publicados.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isMap, isSeq, parseDocument, type YAMLMap } from "yaml";

type Q = { slug: string; type: string; title: string; required: boolean; skills: Record<string, number>; payload?: Record<string, unknown> };

function topic(title: string) {
  return title.includes("—") ? title.split("—")[1].trim() : title;
}

function skillWeights(skills: string[]): Record<string, number> {
  if (skills.length === 0) return {};
  if (skills.length === 1) return { [skills[0]]: 1 };
  return { [skills[0]]: 0.7, [skills[1]]: 0.3 };
}

function questsFor(zoneSlug: string, skills: string[], levelSlug: string, n: number, title: string): Q[] {
  const t = topic(title);
  const sk = skillWeights(skills);
  // Objetos nuevos en cada quest: si se comparten, la librería YAML escribe anclas (&a1 / *a1).
  const q = (suffix: string, type: string, qTitle: string, required = true, payload?: Record<string, unknown>): Q => ({
    slug: `${levelSlug}-${suffix}`,
    type,
    title: qTitle,
    required,
    skills: { ...sk },
    ...(payload ? { payload: { ...payload } } : {}),
  });

  if (zoneSlug === "interview-arena") {
    const eng = { english: 0.8, ai_tools: 0.2 };
    const list: Q[] =
      n === 2
        ? [q("learn-star", "learn", "El método STAR"), q("open-star", "open_answer", "Responde una pregunta conductual con STAR"), q("interview-behavioral", "interview", "Mini-entrevista conductual", true, { mode: "behavioral" })]
        : n === 3
          ? [q("interview-java", "interview", "Screen técnico: Java", true, { mode: "technical_screen", zone: "java-forest" }), q("interview-eda", "interview", "Screen técnico: Pub/Sub", true, { mode: "technical_screen", zone: "event-harbor" }), q("interview-cassandra", "interview", "Screen técnico: Cassandra", true, { mode: "technical_screen", zone: "cassandra-caverns" }), q("learn-ai", "learn", "Uso responsable de asistentes de IA en el desarrollo")]
          : n === 4
            ? [q("learn-design", "learn", "Cómo abordar una entrevista de system design"), q("interview-design", "interview", "System design: pipeline de eventos de órdenes", true, { mode: "system_design" }), q("interview-takehome", "interview", "Mini take-home bajo tiempo", true, { mode: "coding_task" })]
            : [q("learn-negotiation", "learn", "Negociación y preguntas para el entrevistador"), q("boss-mock-loop", "boss", "Jefe: Mock Loop completo")];
    return list.map((x) => ({ ...x, skills: x.slug.includes("learn-ai") ? { ai_tools: 1 } : { ...eng } }));
  }

  if (zoneSlug === "capstone-castle") {
    // Los 10 milestones del SPEC (sección 7), dos por nivel; el 10 es la defensa (jefe).
    const M: [string, Record<string, number>][] = [
      ["Servicio Spring Boot: API de órdenes", { java: 1 }],
      ["Publicar eventos a Pub/Sub (emulador)", { eda: 1 }],
      ["Consumidor idempotente con DLQ", { eda: 1 }],
      ["Persistencia en Cassandra (3 nodos)", { cassandra: 1 }],
      ["Exportación a BigQuery", { bigquery_sql: 1 }],
      ["Métricas Prometheus, dashboard Grafana y 2 alertas", { observability: 1 }],
      ["GitHub Actions: build, test y deploy a Cloud Run", { cicd: 0.5, microservices_gcp: 0.5 }],
      ["JWT, pruebas con Testcontainers y k6", { security: 0.5, testing: 0.5 }],
      ["README en inglés con arquitectura y decisiones técnicas", { english: 1 }],
    ];
    const lab = (i: number): Q => ({ ...q(`milestone-${i + 1}`, "lab", `Milestone ${i + 1}: ${M[i][0]}`), skills: { ...M[i][1] } });
    if (n === 5) return [lab(8), { ...q("boss-defense", "boss", "Milestone 10 — Final del castillo: defiende tu proyecto"), skills: { english: 0.5, java: 0.5 } }];
    return [lab((n - 1) * 2), lab((n - 1) * 2 + 1)];
  }

  if (n === 1) return [q("learn-1", "learn", `Conceptos: ${t}`), q("learn-2", "learn", `Lectura guiada: ${t}`), q("glossary", "glossary", "Vocabulario del nivel"), q("quiz", "quiz", `Quiz — ${t}`)];
  if (n === 5) return [q("learn-review", "learn", "Repaso para el jefe"), q("quiz-final", "quiz", "Examen final de la zona"), q("boss-fight", "boss", `Jefe: ${t}`), q("interview", "interview", "Mini-entrevista de la zona", false, { mode: "technical_screen", zone: zoneSlug })];
  return [q("learn", "learn", t), q("glossary", "glossary", "Vocabulario del nivel"), q("lab", "lab", `Lab: ${t}`), q("quiz", "quiz", `Quiz — ${t}`)];
}

const dir = path.join("content", "zones");
let total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".yaml"))) {
  const p = path.join(dir, f);
  const doc = parseDocument(readFileSync(p, "utf8"));
  const zoneSlug = String(doc.get("slug"));
  const zoneOutline = doc.get("status") === "outline";
  const skills = (doc.toJS().skills ?? []) as string[];
  const levels = doc.get("levels");
  if (!isSeq(levels)) continue;
  let changed = 0;
  for (const item of levels.items) {
    if (!isMap(item)) continue;
    const outline = zoneOutline || item.get("status") === "outline";
    const existing = item.get("quests");
    if (!outline || (isSeq(existing) && existing.items.length > 0)) continue;
    const quests = questsFor(zoneSlug, skills, String(item.get("slug")), Number(item.get("number")), String(item.get("title")));
    (item as YAMLMap).flow = false;
    item.set("quests", doc.createNode(quests));
    changed += quests.length;
  }
  if (changed) {
    writeFileSync(p, doc.toString({ lineWidth: 0 }));
    console.log(`${f}: +${changed} quests esqueleto`);
    total += changed;
  }
}
console.log(`[gen-skeletons] total: ${total}`);
