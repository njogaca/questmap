/**
 * Genera el prompt para que Claude (Claude Code, claude.ai o la API) escriba el YAML de un nivel.
 *
 *   npm run content:new -- --zone observability-observatory --level 1
 *   npm run content:new -- --zone observability-observatory --level 1 --api   (usa ANTHROPIC_API_KEY y CLAUDE_MODEL)
 *
 * Deja los archivos en content/_drafts/. Después:  npm run content:apply -- --file content/_drafts/<zona>-<n>.yaml
 */
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stringify } from "yaml";
import { loadContent } from "../src/content/load";
import { arg, loadDotEnv } from "./lib/env";

loadDotEnv();

const LEVEL_KIND = ["", "Novice (conceptos y vocabulario)", "Apprentice (laboratorio guiado)", "Journeyman (construir de forma independiente)", "Expert (fallos, rendimiento, troubleshooting, trade-offs)", "Pro / Boss (nivel entrevista)"];

function buildPrompt(zoneSlug: string, levelNumber: number) {
  const content = loadContent();
  const zone = content.zones.find((z) => z.slug === zoneSlug);
  if (!zone) throw new Error(`No existe la zona "${zoneSlug}". Zonas: ${content.zones.map((z) => z.slug).join(", ")}`);
  const level = zone.levels.find((l) => l.number === levelNumber);
  if (!level) throw new Error(`La zona ${zoneSlug} no tiene nivel ${levelNumber}.`);

  const example = content.zones.find((z) => z.slug === "java-forest")?.levels.find((l) => l.number === 2);
  const exampleYaml = example ? stringify({ level: { ...example, quests: example.quests.slice(0, 4) } }, { lineWidth: 120 }) : "";
  const skills = content.skills.map((s) => s.code).join(", ");
  const resourceSlugs = content.resources.map((r) => r.slug).join(", ");
  const termPrefix = zoneSlug.split("-")[0].slice(0, 6);
  const allLevels = zone.levels.map((l) => `  ${l.number}. ${l.title}${l.number === levelNumber ? "   <-- ESTE" : ""}`).join("\n");

  return `Eres un diseñador instruccional senior y un ingeniero backend experto. Escribe el contenido de UN nivel de QuestMap,
un sistema de estudio gamificado para Johan: Integration Engineer con 8+ años en IBM IIB/MQ (banca Tier-1) que se prepara
para "Home Depot — Software Engineer, Backend & Distributed Systems". Su idioma es el español; su inglés es funcional pero limitado.
Usa Windows + Docker Desktop (WSL2) + PowerShell 7. Estudia desde la PC.

ZONA: ${zone.title} (${zone.slug}) — skills: ${zone.skills.join(", ")}
Historia de la zona: ${zone.story ?? ""}
Niveles de la zona:
${allLevels}

NIVEL A ESCRIBIR: ${levelNumber} — ${level.title}
Tipo de nivel: ${LEVEL_KIND[levelNumber]}

REGLAS
- UI y explicaciones en ESPAÑOL SIMPLE. Términos técnicos en inglés con definición en español.
- Comandos SIEMPRE en PowerShell (una línea, o continuación con acento grave \`). Nada de bash.
- Analogías cotidianas y variadas en el glosario (\`analogy\`). \`analogy_mq\` (IBM MQ/IIB) solo si de verdad ayuda; no lo fuerces.
- RECURSOS: NO inventes URLs. Si puedes verificar una URL con búsqueda/navegación web, úsala con verified: true. Si no, url: null,
  verified: false y \`how_to_find\` con cómo encontrarla. Prioriza gratis; los libros de pago como optional.
  Puedes reutilizar recursos existentes por slug: ${resourceSlugs}
- Skills válidas: ${skills}. Pesos entre 0 y 1 por quest.
- Quests del nivel (3–8): para niveles 1–4 usa normalmente 2 learn + 1 glossary + 1 lab (niveles 2–4) + 1 quiz + 1 micro opcional.
  Nivel 5: 1 learn de repaso + 1 quiz final difícil + 1 boss (payload: task, rubric, interview_focus) + 1 interview opcional.
- Cada quest: slug kebab-case único con prefijo "${termPrefix}-${levelNumber}-", type, title, required, estimated_min, skills, y lo que su tipo necesite.
- learn: resources [{ref}], payload.note_prompt (pregunta para que escriba 2–3 líneas con sus palabras); opcional payload.summary_md.
- glossary: payload.terms con 5–9 slugs de términos que definas abajo.
- lab: payload { goal, steps: [{title, body, commands: [PowerShell]}], expected, checklist, hints, evidence_hint }.
  Para código largo dentro de body usa bloques \`\`\`java … \`\`\`.
- quiz: AL MENOS 8 preguntas; mezcla mcq, tf, order y fill. Cada pregunta con slug único "${termPrefix}${levelNumber}-qN",
  prompt, options (mcq/order), answer (mcq: índice; tf: boolean; order: arreglo de índices en orden correcto; fill: lista de textos aceptados),
  explanation (SIEMPRE explica por qué), skill, difficulty 1–3, hint opcional.
- micro: payload { kind: flashcards | speaking | writing | reading, terms o instructions }.
- Términos de glosario nuevos: slug con prefijo "${termPrefix}-", term, category, definition_es (1–3 frases), definition_en (1–2 frases simples),
  example_en (frase corta), analogy, see_also.

FORMATO DE SALIDA
Devuelve SOLO un bloque \`\`\`yaml con este formato (sin texto fuera del bloque):
\`\`\`yaml
level:
  slug: ${level.slug}
  number: ${levelNumber}
  title: "${level.title}"
  story: "…"
  quests: [ … ]
glossary:
  - slug: …
resources:          # solo recursos NUEVOS (no repitas los existentes)
  - slug: res-…
\`\`\`

EJEMPLO DE ESTILO (Java Forest, nivel 2, recortado):
\`\`\`yaml
${exampleYaml}\`\`\`
`;
}

async function main() {
  const zone = arg("zone");
  const level = Number(arg("level"));
  if (!zone || !Number.isInteger(level) || level < 1 || level > 5) {
    console.error("Uso: npm run content:new -- --zone <slug> --level <1-5> [--api]");
    process.exit(1);
  }
  const prompt = buildPrompt(zone, level);
  const dir = path.join("content", "_drafts");
  mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${zone}-${level}`);
  writeFileSync(`${base}.prompt.md`, prompt);
  console.log(`[content:new] Prompt guardado en ${base}.prompt.md (${prompt.length} caracteres)`);

  if (arg("api") !== "true") {
    console.log("\nSiguiente paso (Modo A): copia el prompt en claude.ai o pídeselo a Claude Code, guarda el bloque YAML como");
    console.log(`  ${base}.yaml`);
    console.log(`y aplícalo con:  npm run content:apply -- --file ${base}.yaml`);
    return;
  }

  const model = process.env.CLAUDE_MODEL;
  if (!process.env.ANTHROPIC_API_KEY || !model) throw new Error("Para --api necesitas ANTHROPIC_API_KEY y CLAUDE_MODEL en .env");
  console.log(`[content:new] Llamando a ${model}… (puede tardar unos minutos)`);
  const client = new Anthropic();
  const stream = client.messages.stream({
    model,
    max_tokens: 32000,
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Claude declinó la solicitud.");
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  const yamlBlock = text.match(/```ya?ml\s*([\s\S]*?)```/)?.[1] ?? text;
  writeFileSync(`${base}.yaml`, yamlBlock);
  console.log(`[content:new] Borrador guardado en ${base}.yaml (${message.usage.input_tokens + message.usage.output_tokens} tokens).`);
  console.log(`Revísalo y aplícalo con:  npm run content:apply -- --file ${base}.yaml`);
}

main().catch((e) => {
  console.error("[content:new] ERROR", e instanceof Error ? e.message : e);
  process.exit(1);
});
