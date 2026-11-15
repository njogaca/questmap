import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  glossaryFileSchema,
  interviewsFileSchema,
  resourcesFileSchema,
  skillsFileSchema,
  tracksFileSchema,
  zoneSchema,
  type GlossaryFile,
  type InterviewsFile,
  type ResourceInput,
  type SkillInput,
  type TrackInput,
  type ZoneInput,
} from "./schema";

export type ContentBundle = {
  tracks: TrackInput[];
  skills: SkillInput[];
  resources: ResourceInput[];
  zones: ZoneInput[];
  glossary: GlossaryFile[];
  interviews: InterviewsFile[];
};

function readYaml<T extends z.ZodTypeAny>(file: string, schema: T): z.infer<T> {
  const raw = parse(readFileSync(file, "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Contenido inválido en ${file}:\n${issues}`);
  }
  return result.data;
}

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Lee y valida todo `content/`. Lanza un error legible si algo no cumple el esquema. */
export function loadContent(root = path.join(process.cwd(), "content")): ContentBundle {
  const tracksFile = path.join(root, "tracks.yaml");
  const tracks = existsSync(tracksFile) ? readYaml(tracksFile, tracksFileSchema).tracks : [];
  const skills = readYaml(path.join(root, "skills.yaml"), skillsFileSchema).skills;
  const resourcesFile = path.join(root, "resources.yaml");
  const resources = existsSync(resourcesFile) ? readYaml(resourcesFile, resourcesFileSchema).resources : [];
  const zones = yamlFiles(path.join(root, "zones")).map((f) => readYaml(f, zoneSchema));
  const glossary = yamlFiles(path.join(root, "glossary")).map((f) => readYaml(f, glossaryFileSchema));
  const interviews = yamlFiles(path.join(root, "interviews")).map((f) => readYaml(f, interviewsFileSchema));

  validateReferences({ tracks, skills, resources, zones, glossary, interviews });
  return { tracks, skills, resources, zones, glossary, interviews };
}

function validateReferences(c: ContentBundle) {
  const errors: string[] = [];
  const trackSlugs = new Set(c.tracks.map((t) => t.slug));
  const skillCodes = new Set(c.skills.map((s) => s.code));
  const resourceSlugs = new Set(c.resources.map((r) => r.slug));
  const zoneSlugs = new Set(c.zones.map((z) => z.slug));
  const seen = new Map<string, string>();

  const unique = (kind: string, s: string) => {
    if (seen.has(s)) errors.push(`slug duplicado "${s}" (${kind} y ${seen.get(s)})`);
    else seen.set(s, kind);
  };

  for (const t of c.tracks) unique("track", t.slug);
  for (const r of c.resources) unique("resource", r.slug);
  for (const sk of c.skills)
    if (typeof sk.track === "string" && !trackSlugs.has(sk.track))
      errors.push(`skill ${sk.code}: ruta desconocida "${sk.track}"`);
  for (const z of c.zones) {
    unique("zone", z.slug);
    if (typeof z.track === "string" && !trackSlugs.has(z.track))
      errors.push(`zona ${z.slug}: ruta desconocida "${z.track}"`);
    for (const p of z.prerequisites)
      if (!zoneSlugs.has(p.zone)) errors.push(`zona ${z.slug}: prerrequisito desconocido "${p.zone}"`);
    for (const s of z.skills) if (!skillCodes.has(s)) errors.push(`zona ${z.slug}: skill desconocida "${s}"`);
    const numbers = new Set<number>();
    for (const l of z.levels) {
      unique("level", l.slug);
      if (numbers.has(l.number)) errors.push(`zona ${z.slug}: nivel ${l.number} repetido`);
      numbers.add(l.number);
      for (const q of l.quests) {
        unique("quest", q.slug);
        for (const s of Object.keys(q.skills))
          if (!skillCodes.has(s)) errors.push(`quest ${q.slug}: skill desconocida "${s}"`);
        for (const r of q.resources)
          if (!resourceSlugs.has(r.ref)) errors.push(`quest ${q.slug}: recurso desconocido "${r.ref}"`);
        for (const qq of q.questions)
          if (!skillCodes.has(qq.skill)) errors.push(`quest ${q.slug}: pregunta con skill desconocida "${qq.skill}"`);
        const published = z.status === "published" && l.status === "published" && q.status === "published";
        if (q.type === "quiz" && published && q.questions.length === 0)
          errors.push(`quest ${q.slug}: un quiz publicado necesita preguntas`);
      }
    }
  }
  for (const g of c.glossary) for (const t of g.terms) unique("glossary_term", t.slug);
  const termSlugs = new Set(c.glossary.flatMap((g) => g.terms.map((t) => t.slug)));
  for (const z of c.zones)
    for (const l of z.levels)
      for (const q of l.quests) {
        const terms = q.payload.terms;
        if (Array.isArray(terms))
          for (const t of terms)
            if (!termSlugs.has(String(t))) errors.push(`quest ${q.slug}: término de glosario desconocido "${t}"`);
      }
  for (const f of c.interviews) for (const t of f.templates) unique("interview_template", t.slug);
  const templateSlugs = new Set(c.interviews.flatMap((f) => f.templates.map((t) => t.slug)));
  for (const z of c.zones)
    for (const l of z.levels)
      for (const q of l.quests) {
        const tpl = q.payload.template;
        if (tpl !== undefined && !templateSlugs.has(String(tpl)))
          errors.push(`quest ${q.slug}: plantilla de entrevista desconocida "${tpl}"`);
      }

  if (errors.length) throw new Error(`Referencias inválidas en content/:\n  - ${errors.join("\n  - ")}`);
}
