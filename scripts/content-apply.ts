/**
 * Valida un borrador de nivel (generado con content:new) y lo integra en content/.
 *
 *   npm run content:apply -- --file content/_drafts/observability-observatory-1.yaml
 *   npm run content:apply -- --file … --dry-run     (solo valida, no escribe)
 *
 * - Valida con los mismos esquemas Zod que el seed.
 * - Reemplaza el nivel (normalmente "outline") en content/zones/<zona>.yaml y lo publica.
 * - Agrega los términos nuevos al glosario de la zona y los recursos nuevos a resources.yaml.
 * - Vuelve a validar TODO content/; si algo falla, deshace los cambios.
 * Después reconstruye (docker compose up -d --build) para que el seed lo cargue sin tocar tu progreso.
 */
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isMap, isSeq, parse, parseDocument, YAMLMap } from "yaml";
import { z } from "zod";
import { loadContent } from "../src/content/load";
import { glossaryTermSchema, levelSchema, resourceSchema, zoneSchema } from "../src/content/schema";
import { arg } from "./lib/env";

const draftSchema = z.object({
  level: levelSchema,
  glossary: z.array(glossaryTermSchema).default([]),
  resources: z.array(resourceSchema).default([]),
});

const ROOT = "content";

/** Contenido original de cada archivo que tocamos (null = no existía). Permite deshacer ante CUALQUIER error. */
const originals = new Map<string, string | null>();

function rollback() {
  for (const [p, text] of originals) {
    if (text === null) {
      if (existsSync(p)) unlinkSync(p);
    } else writeFileSync(p, text);
  }
  if (originals.size) console.error(`[content:apply] Se deshicieron los cambios en ${originals.size} archivo(s).`);
  originals.clear();
}

function fail(msg: string): never {
  console.error(`[content:apply] ERROR ${msg}`);
  rollback();
  process.exit(1);
}

function main() {
  const file = arg("file");
  const dryRun = arg("dry-run") === "true";
  if (!file || file === "true") fail("Uso: npm run content:apply -- --file content/_drafts/<zona>-<n>.yaml [--dry-run]");
  if (!existsSync(file)) fail(`No existe ${file}`);

  // Se valida con Zod, pero se ESCRIBE el YAML tal como vino (sin los valores por defecto que agrega Zod).
  let raw: { level: Record<string, unknown>; glossary?: Record<string, unknown>[]; resources?: Record<string, unknown>[] };
  try {
    raw = parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`El borrador no es YAML válido: ${e instanceof Error ? e.message.split("\n")[0] : e}\n  (Tip: si un texto contiene ": ", ponlo entre comillas.)`);
  }
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success)
    fail(`El borrador no cumple el esquema:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  const draft = parsed.data;

  // Reglas de contenido de la v1 (sección 7 del SPEC).
  const problems: string[] = [];
  for (const q of draft.level.quests) {
    if (q.type === "quiz" && q.questions.length < 8) problems.push(`quiz ${q.slug}: tiene ${q.questions.length} preguntas (mínimo 8)`);
    if (q.type === "quiz" && q.questions.some((x) => !x.slug)) problems.push(`quiz ${q.slug}: cada pregunta necesita un slug estable`);
    if (!q.estimated_min) problems.push(`quest ${q.slug}: falta estimated_min`);
  }
  for (const r of draft.resources) if (r.verified && !r.url) problems.push(`recurso ${r.slug}: verified sin url`);
  if (problems.length) fail(`Reglas de contenido:\n  - ${problems.join("\n  - ")}`);

  // Ubicar la zona que contiene el nivel.
  const zonesDir = path.join(ROOT, "zones");
  const zoneFile = readdirSync(zonesDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => path.join(zonesDir, f))
    .find((f) => zoneSchema.safeParse(parse(readFileSync(f, "utf8"))).data?.levels.some((l) => l.slug === draft.level.slug));
  if (!zoneFile) fail(`Ningún archivo de zona tiene el nivel "${draft.level.slug}". Usa el slug que generó content:new.`);
  const zoneSlug = String(parse(readFileSync(zoneFile, "utf8")).slug);

  const write = (p: string, text: string) => {
    if (!originals.has(p)) originals.set(p, existsSync(p) ? readFileSync(p, "utf8") : null);
    if (!dryRun) writeFileSync(p, text);
  };

  /* ---- zona: reemplazar el nivel ---- */
  const doc = parseDocument(readFileSync(zoneFile, "utf8"));
  const levels = doc.get("levels");
  if (!isSeq(levels)) fail(`${zoneFile}: 'levels' no es una lista`);
  const zoneWasOutline = doc.get("status") === "outline";
  levels.items.forEach((item, i) => {
    if (!isMap(item)) return;
    if (item.get("slug") === draft.level.slug) {
      const newLevel = { ...raw.level };
      delete newLevel.status; // se publica
      levels.items[i] = doc.createNode(newLevel) as YAMLMap;
    } else if (zoneWasOutline && !item.has("status")) {
      // Al publicar la zona, los demás niveles siguen siendo esqueleto.
      item.set("status", "outline");
    }
  });
  if (zoneWasOutline) doc.delete("status");
  write(zoneFile, doc.toString({ lineWidth: 0 }));

  /* ---- glosario de la zona ---- */
  if (draft.glossary.length) {
    const gDir = path.join(ROOT, "glossary");
    const existingFile = readdirSync(gDir)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => path.join(gDir, f))
      .find((f) => parse(readFileSync(f, "utf8"))?.zone === zoneSlug);
    const gFile = existingFile ?? path.join(gDir, `${zoneSlug}.yaml`);
    const gDoc = parseDocument(existsSync(gFile) ? readFileSync(gFile, "utf8") : `zone: ${zoneSlug}\nterms: []\n`);
    const terms = gDoc.get("terms");
    if (!isSeq(terms)) fail(`${gFile}: 'terms' no es una lista`);
    const have = new Set(terms.items.map((t) => (isMap(t) ? String(t.get("slug")) : "")));
    let added = 0;
    for (const t of raw.glossary ?? []) {
      if (have.has(String(t.slug))) continue;
      terms.items.push(gDoc.createNode(t) as YAMLMap);
      added++;
    }
    write(gFile, gDoc.toString({ lineWidth: 0 }));
    console.log(`[content:apply] glosario: +${added} términos en ${gFile}`);
  }

  /* ---- recursos nuevos ---- */
  if (draft.resources.length) {
    const rFile = path.join(ROOT, "resources.yaml");
    const rDoc = parseDocument(readFileSync(rFile, "utf8"));
    const list = rDoc.get("resources");
    if (!isSeq(list)) fail("resources.yaml: 'resources' no es una lista");
    const have = new Set(list.items.map((r) => (isMap(r) ? String(r.get("slug")) : "")));
    let added = 0;
    for (const r of raw.resources ?? []) {
      if (have.has(String(r.slug))) continue;
      list.items.push(rDoc.createNode(r) as YAMLMap);
      added++;
    }
    write(rFile, rDoc.toString({ lineWidth: 0 }));
    console.log(`[content:apply] recursos: +${added} en ${rFile}`);
  }

  /* ---- validación global; si falla, deshacer ---- */
  if (dryRun) {
    console.log(`[content:apply] --dry-run: el borrador es válido para ${zoneFile} (no se escribió nada).`);
    return;
  }
  try {
    loadContent(path.resolve(ROOT));
  } catch (e) {
    fail(`La validación global falló:\n${e instanceof Error ? e.message : e}`);
  }
  console.log(`[content:apply] OK: nivel ${draft.level.number} publicado en ${zoneFile}.`);
  console.log("Reconstruye para cargarlo:  docker compose up -d --build");
}

main();
