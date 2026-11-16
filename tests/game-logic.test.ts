import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gradeAnswer, scorePercent } from "../src/lib/quiz";
import { computeReadiness } from "../src/lib/readiness";
import { COMMIT_URL_RE, effortXp } from "../src/lib/rules";
import { reviewCard, SRS_NEW } from "../src/lib/srs";
import { computeStreak } from "../src/lib/streak";
import { localDate, weekStart } from "../src/lib/time";
import { questXpAwarded, rankFor } from "../src/lib/xp";

describe("time", () => {
  it("weekStart devuelve el lunes", () => {
    assert.equal(weekStart("2026-11-05"), "2026-11-02"); // jueves → lunes
    assert.equal(weekStart("2026-11-08"), "2026-11-02"); // domingo → lunes anterior
    assert.equal(weekStart("2026-11-02"), "2026-11-02");
  });
  it("localDate respeta la zona horaria (11:30 pm en Atlanta sigue siendo el mismo día)", () => {
    const at = new Date("2026-11-06T04:30:00Z"); // 23:30 del 5 nov en America/New_York
    assert.equal(localDate(at, "America/New_York"), "2026-11-05");
    assert.equal(localDate(at, "UTC"), "2026-11-06");
  });
});

describe("streak", () => {
  // Semana: lun 2 nov … dom 8 nov 2026
  it("cuenta días con ≥ 10 min y no cuenta los de < 10", () => {
    const r = computeStreak({ "2026-11-02": 15, "2026-11-03": 9, "2026-11-04": 20 }, "2026-11-04");
    // el 3 tiene 9 min → usa la congelación; racha = 2 (lun + mié)
    assert.equal(r.current, 2);
    assert.equal(r.freezeUsedThisWeek, true);
  });
  it("el segundo día sin estudio de la semana rompe la racha", () => {
    const r = computeStreak({ "2026-11-02": 30, "2026-11-04": 30, "2026-11-06": 30 }, "2026-11-06");
    // 3 nov congelación, 5 nov rompe → racha nueva = 1 (el 6)
    assert.equal(r.current, 1);
    assert.equal(r.best, 2);
  });
  it("la congelación se renueva cada lunes", () => {
    const r = computeStreak(
      { "2026-11-05": 30, "2026-11-07": 30, "2026-11-08": 30, "2026-11-10": 30 },
      "2026-11-10",
    );
    // 6 nov (semana 1) congelación; 9 nov (semana 2) congelación nueva → racha 4
    assert.equal(r.current, 4);
  });
  it("hoy sin estudiar todavía no rompe la racha", () => {
    const r = computeStreak({ "2026-11-03": 30, "2026-11-04": 30 }, "2026-11-05");
    assert.equal(r.current, 2);
    assert.equal(r.todayDone, false);
    assert.equal(r.freezeUsedThisWeek, false);
  });
  it("el jueves no es especial", () => {
    const r = computeStreak({ "2026-11-04": 30, "2026-11-06": 30 }, "2026-11-06");
    assert.equal(r.current, 2);
    assert.equal(r.freezeUsedThisWeek, true);
  });
  it("sin datos: racha 0", () => {
    assert.equal(computeStreak({}, "2026-11-05").current, 0);
  });
});

describe("srs", () => {
  it("good en una tarjeta nueva → 1 día; segunda vez → 6 días", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    const a = reviewCard(SRS_NEW, "good", now);
    assert.equal(a.intervalDays, 1);
    const b = reviewCard(a, "good", now);
    assert.equal(b.intervalDays, 6);
  });
  it("again reinicia y suma un lapse sin bajar ease de 1.3", () => {
    let s = { ...SRS_NEW, ease: 1.35 };
    s = reviewCard(s, "again");
    assert.equal(s.reps, 0);
    assert.equal(s.lapses, 1);
    assert.ok(s.ease >= 1.3);
  });
  it("easy crece más rápido que hard", () => {
    const base = { ease: 2.5, intervalDays: 6, reps: 2, lapses: 0 };
    assert.ok(reviewCard(base, "easy").intervalDays > reviewCard(base, "hard").intervalDays);
  });
});

describe("xp y rangos", () => {
  it("quiz ≥ 95 % suma +10; las pistas restan 20 %", () => {
    assert.equal(questXpAwarded({ baseXp: 40, type: "quiz", hintsUsed: 0, quizScore: 100 }), 50);
    assert.equal(questXpAwarded({ baseXp: 40, type: "quiz", hintsUsed: 0, quizScore: 90 }), 40);
    assert.equal(questXpAwarded({ baseXp: 50, type: "lab", hintsUsed: 2 }), 40);
  });
  it("ruta de esfuerzo: un quiz de 0 puntos no da bono; las horas dan 10 puntos por cada 30 min", () => {
    assert.equal(questXpAwarded({ baseXp: 0, type: "quiz", hintsUsed: 0, quizScore: 100 }), 0);
    assert.equal(effortXp(30), 10);
    assert.equal(effortXp(20), 7);
    assert.equal(effortXp(90), 30);
    assert.equal(effortXp(0), 0);
  });
  it("solo cuenta como commit un enlace a un commit concreto", () => {
    assert.ok(COMMIT_URL_RE.test("https://github.com/user/orderbridge/commit/a1b2c3d"));
    assert.ok(COMMIT_URL_RE.test("listo: https://gitlab.com/u/r/-/commit/0123456789abcdef0123456789abcdef01234567"));
    assert.ok(!COMMIT_URL_RE.test("https://github.com/user/orderbridge"));
    assert.ok(!COMMIT_URL_RE.test("lo subí ayer, commit a1b2c3d"));
  });
  it("rangos por XP", () => {
    assert.equal(rankFor(0).name, "Novice");
    assert.equal(rankFor(1500).name, "Junior Dev");
    assert.equal(rankFor(99999).name, "Home Depot Ready");
    assert.equal(rankFor(99999).nextName, null);
  });
});

describe("quiz", () => {
  const base = { prompt: "", explanation: "", skill: "java", difficulty: 1 };
  it("califica mcq, tf, order y fill", () => {
    assert.equal(gradeAnswer("mcq", { ...base, answer: 2 }, 2), true);
    assert.equal(gradeAnswer("tf", { ...base, answer: false }, false), true);
    assert.equal(gradeAnswer("tf", { ...base, answer: false }, true), false);
    assert.equal(gradeAnswer("order", { ...base, answer: [2, 0, 1] }, [2, 0, 1]), true);
    assert.equal(gradeAnswer("order", { ...base, answer: [2, 0, 1] }, [0, 2, 1]), false);
    assert.equal(gradeAnswer("fill", { ...base, answer: ["interface", "interfaz"] }, "  Interfaz "), true);
  });
  it("porcentaje", () => assert.equal(scorePercent(7, 8), 88));
});

describe("readiness", () => {
  const skills = [
    { code: "java", name: "Java", core: true, targetXp: 200 },
    { code: "eda", name: "EDA", core: true, targetXp: 400 },
  ];
  const quests = [
    { id: 1, xp: 100, status: "published", skills: [{ code: "java", weight: 1 }] },
    { id: 2, xp: 100, status: "published", skills: [{ code: "java", weight: 0.5 }, { code: "eda", weight: 0.5 }] },
    { id: 3, xp: 100, status: "outline", skills: [{ code: "eda", weight: 1 }] },
  ];
  it("cobertura usa solo lo publicado; readiness usa target_xp fijo", () => {
    const r = computeReadiness(skills, quests, [{ questId: 1, completed: true, xpAwarded: 100 }]);
    const java = r.scores.find((s) => s.code === "java")!;
    const eda = r.scores.find((s) => s.code === "eda")!;
    assert.equal(java.coverage, 67); // 100 / 150
    assert.equal(java.readiness, 50); // 100 / 200
    assert.equal(eda.coverage, 0);
    assert.equal(eda.readiness, 0);
    assert.equal(r.readyToApply, false);
    assert.deepEqual(r.coreBelow.map((s) => s.code), ["java", "eda"]);
  });
  it("las zonas outline nunca suben la cobertura a 100 % ficticio del readiness", () => {
    const r = computeReadiness(skills, quests, [
      { questId: 1, completed: true, xpAwarded: 100 },
      { questId: 2, completed: true, xpAwarded: 100 },
    ]);
    const eda = r.scores.find((s) => s.code === "eda")!;
    assert.equal(eda.coverage, 100); // todo lo publicado de eda está hecho
    assert.equal(eda.readiness, 13); // 50 / 400: aún lejos
  });
});
