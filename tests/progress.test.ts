import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeProgress, type LevelIn, type ProgressIn, type QuestIn, type ZoneIn } from "../src/lib/progress";

// Mundo mínimo: Z1 (inicio, 5 niveles con 1 quest required c/u) y Z2 (requiere Z1 nivel 2).
const zones: ZoneIn[] = [
  { id: 1, slug: "z1", status: "published", unlockedFromStart: true },
  { id: 2, slug: "z2", status: "published", unlockedFromStart: false },
  { id: 3, slug: "z3", status: "outline", unlockedFromStart: true },
];
const levels: LevelIn[] = [
  ...[1, 2, 3, 4, 5].map((n) => ({ id: 10 + n, zoneId: 1, number: n, status: "published" as const })),
  { id: 21, zoneId: 2, number: 1, status: "published" },
  { id: 31, zoneId: 3, number: 1, status: "outline" },
];
const quests: QuestIn[] = [
  ...[1, 2, 3, 4, 5].map((n) => ({ id: 100 + n, levelId: 10 + n, required: true, status: "published" as const })),
  { id: 199, levelId: 11, required: false, status: "published" }, // optional: no bloquea
  { id: 201, levelId: 21, required: true, status: "published" },
];
const prereqs = [{ zoneId: 2, requiresZoneId: 1, requiresLevelNumber: 2 }];

const run = (progress: ProgressIn[]) => computeProgress({ zones, levels, quests, prereqs, progress });
const done = (...ids: number[]): ProgressIn[] => ids.map((questId) => ({ questId, status: "completed" }));

describe("computeProgress", () => {
  it("al inicio: Z1 disponible, solo su nivel 1 abierto; Z2 bloqueada; Z3 outline", () => {
    const w = run([]);
    assert.equal(w.zones.get(1)!.state, "available");
    assert.equal(w.levels.get(11)!.state, "available");
    assert.equal(w.levels.get(12)!.state, "locked");
    assert.equal(w.quests.get(102), "locked");
    assert.equal(w.zones.get(2)!.state, "locked");
    assert.equal(w.zones.get(3)!.state, "outline");
  });

  it("completar el nivel 1 desbloquea el nivel 2 (las optional no cuentan)", () => {
    const w = run(done(101));
    assert.equal(w.levels.get(11)!.state, "completed");
    assert.equal(w.levels.get(12)!.state, "available");
    assert.equal(w.zones.get(1)!.state, "in_progress");
    assert.equal(w.zones.get(2)!.state, "locked");
  });

  it("completar Z1 nivel 2 desbloquea Z2", () => {
    const w = run(done(101, 102));
    assert.equal(w.zones.get(2)!.state, "available");
    assert.equal(w.zones.get(2)!.missingPrereqs.length, 0);
    assert.equal(w.quests.get(201), "available");
  });

  it("completar los 5 niveles marca la zona como completada al 100 %", () => {
    const w = run(done(101, 102, 103, 104, 105));
    assert.equal(w.zones.get(1)!.state, "completed");
    assert.equal(w.zones.get(1)!.percent, 100);
    assert.equal(w.zones.get(1)!.levelsCompleted, 5);
  });

  it("una zona de 7 niveles (mundo del plan) solo se completa con los 7 y abre la siguiente", () => {
    const z: ZoneIn[] = [
      { id: 1, slug: "m0", status: "published", unlockedFromStart: true },
      { id: 2, slug: "m1", status: "published", unlockedFromStart: false },
      { id: 3, slug: "m2", status: "published", unlockedFromStart: false }, // sin niveles: bloqueada
    ];
    const l: LevelIn[] = [
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: 10 + n, zoneId: 1, number: n, status: "published" as const })),
      { id: 21, zoneId: 2, number: 1, status: "published" },
    ];
    const q: QuestIn[] = [
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: 100 + n, levelId: 10 + n, required: true, status: "published" as const })),
      { id: 201, levelId: 21, required: true, status: "published" },
    ];
    const p = [
      { zoneId: 2, requiresZoneId: 1, requiresLevelNumber: 7 },
      { zoneId: 3, requiresZoneId: 2, requiresLevelNumber: 13 },
    ];
    const at = (ids: number[]) => computeProgress({ zones: z, levels: l, quests: q, prereqs: p, progress: done(...ids) });

    const six = at([101, 102, 103, 104, 105, 106]);
    assert.equal(six.zones.get(1)!.state, "in_progress");
    assert.equal(six.zones.get(1)!.levelsTotal, 7);
    assert.equal(six.zones.get(2)!.state, "locked");

    const seven = at([101, 102, 103, 104, 105, 106, 107]);
    assert.equal(seven.zones.get(1)!.state, "completed");
    assert.equal(seven.zones.get(2)!.state, "available");
    assert.equal(seven.zones.get(3)!.state, "locked");
    assert.equal(seven.zones.get(3)!.levelsTotal, 0);
  });

  it("una quest en progreso marca el nivel en progreso", () => {
    const w = run([{ questId: 101, status: "in_progress" }]);
    assert.equal(w.levels.get(11)!.state, "in_progress");
    assert.equal(w.quests.get(101), "in_progress");
  });

  it("un nivel sin quests publicadas nunca cuenta como completado", () => {
    const w = run([]);
    assert.equal(w.levels.get(31)!.completed, false);
    assert.equal(w.levels.get(31)!.state, "outline");
  });
});
