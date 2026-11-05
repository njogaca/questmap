/**
 * Pruebas de integración contra la base real (docker compose up -d).
 *   npm run test:db
 * Usa DATABASE_URL de .env (localhost:5433). No borra tu progreso: solo crea y elimina una fila marcador.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { Pool } from "pg";
import { loadDotEnv } from "../../scripts/lib/env";

loadDotEnv();
const url = process.env.DATABASE_URL ?? "postgres://questmap:questmap@localhost:5433/questmap";
const pool = new Pool({ connectionString: url });
const MARK = "TEST-SEED-IDEMPOTENT";

const CONTENT_TABLES = ["skills", "zones", "levels", "quests", "quiz_questions", "glossary_terms", "resources", "interview_templates", "badges", "quest_skills", "quest_resources", "zone_prerequisites"];

async function counts() {
  const out: Record<string, number> = {};
  for (const t of CONTENT_TABLES) {
    const r = await pool.query(`select count(*)::int as n from ${t}`);
    out[t] = r.rows[0].n;
  }
  return out;
}

function runSeed() {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

describe("seed (integración con Postgres)", () => {
  let ok = true;
  before(async () => {
    try {
      await pool.query("select 1");
    } catch {
      ok = false;
    }
  });
  after(async () => {
    await pool.query("delete from study_log where activity = $1", [MARK]).catch(() => {});
    await pool.end();
  });

  it("correrlo dos veces no duplica contenido ni toca el progreso", async (t) => {
    if (!ok) return t.skip("Postgres no está disponible en DATABASE_URL (¿docker compose up -d?)");
    await pool.query("insert into study_log (date, minutes, activity) values (current_date, 1, $1)", [MARK]);
    const qpBefore = (await pool.query("select count(*)::int as n from quest_progress")).rows[0].n;

    runSeed();
    const first = await counts();
    runSeed();
    const second = await counts();

    assert.deepEqual(second, first, "el segundo seed cambió la cantidad de filas de contenido");
    const marker = await pool.query("select count(*)::int as n from study_log where activity = $1", [MARK]);
    assert.equal(marker.rows[0].n, 1, "el seed tocó study_log");
    const qpAfter = (await pool.query("select count(*)::int as n from quest_progress")).rows[0].n;
    assert.equal(qpAfter, qpBefore, "el seed tocó quest_progress");
  });

  it("los slugs de contenido son únicos (upsert por slug)", async (t) => {
    if (!ok) return t.skip("Postgres no disponible");
    for (const table of ["zones", "levels", "quests", "quiz_questions", "glossary_terms", "resources"]) {
      const r = await pool.query(`select slug, count(*) from ${table} group by slug having count(*) > 1`);
      assert.equal(r.rowCount, 0, `${table} tiene slugs duplicados`);
    }
  });

  it("la app exporta el progreso como JSON por slug", async (t) => {
    let res: Response;
    try {
      res = await fetch("http://127.0.0.1:3000/api/export");
    } catch {
      return t.skip("La app no está corriendo en 127.0.0.1:3000");
    }
    assert.equal(res.status, 200);
    const data = (await res.json()) as { app: string; version: number; questProgress: unknown[]; studyLog: unknown[] };
    assert.equal(data.app, "questmap");
    assert.equal(data.version, 1);
    assert.ok(Array.isArray(data.questProgress));
    assert.ok(Array.isArray(data.studyLog));
  });
});
