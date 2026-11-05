import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractGrading, isPassing } from "../src/lib/claude/grading";

const json = `{
  "score": 78,
  "criteria": [
    {"name": "correctness", "score": 85, "comment": "Bien {con llaves} en el texto"},
    {"name": "depth", "score": 70, "comment": "..."},
    {"name": "clarity", "score": 80, "comment": "..."},
    {"name": "tradeoffs", "score": 60, "comment": "..."}
  ],
  "english_feedback": [{"original": "I have 8 years experience", "better": "I have 8 years of experience", "why_es": "Falta 'of'"}],
  "gaps": ["ordering keys"],
  "next_step": "Repasa ordering keys"
}`;

describe("extractGrading (parser del JSON de Claude)", () => {
  it("lee un bloque ```json al final de un texto largo", () => {
    const g = extractGrading(`Revisión: muy bien.\n\n\`\`\`json\n${json}\n\`\`\``);
    assert.ok(g);
    assert.equal(g.score, 78);
    assert.equal(g.criteria.length, 4);
    assert.equal(g.english_feedback[0].better, "I have 8 years of experience");
    assert.equal(isPassing(g), true);
  });

  it("lee JSON sin fences (pegado desde claude.ai) aunque haya llaves en el texto", () => {
    const g = extractGrading(`Ejemplo de código: function f() { return 1; }\nAquí va: ${json}\nGracias.`);
    assert.equal(g?.score, 78);
  });

  it("si hay varios JSON, usa el último que tenga score", () => {
    const g = extractGrading(`\`\`\`json\n{"score": 10}\n\`\`\`\nCorregido:\n\`\`\`json\n{"score": 55, "gaps": ["x"]}\n\`\`\``);
    assert.equal(g?.score, 55);
    assert.equal(isPassing(g!), false);
  });

  it("normaliza: completa campos faltantes y limita el score a 0–100", () => {
    const g = extractGrading(`{"score": "130"}`);
    assert.equal(g?.score, 100);
    assert.deepEqual(g?.gaps, []);
    assert.equal(g?.next_step, "");
  });

  it("devuelve null si no hay JSON válido", () => {
    assert.equal(extractGrading("No hay calificación aquí"), null);
    assert.equal(extractGrading('```json\n{"score": }\n```'), null);
  });
});
