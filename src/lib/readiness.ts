/**
 * Job Readiness (sección 5 del SPEC): dos métricas siempre separadas.
 * - Cobertura: XP completado / XP posible del contenido PUBLICADO.
 * - Readiness real: XP ponderado completado / target_xp fijo de la skill (outline cuenta como 0).
 */

export const READY_THRESHOLD = 60;

export type ReadinessSkill = { code: string; name: string; core: boolean; targetXp: number };
export type ReadinessQuest = {
  id: number;
  xp: number;
  status: string; // published | outline | archived
  skills: { code: string; weight: number }[];
};
export type ReadinessProgress = { questId: number; completed: boolean; xpAwarded: number };

export type SkillScore = {
  code: string;
  name: string;
  core: boolean;
  /** 0–100 */
  readiness: number;
  /** 0–100, o null si no hay contenido publicado de esa skill. */
  coverage: number | null;
  earnedXp: number;
  targetXp: number;
};

export function computeReadiness(skills: ReadinessSkill[], quests: ReadinessQuest[], progress: ReadinessProgress[]) {
  const done = new Map(progress.filter((p) => p.completed).map((p) => [p.questId, p.xpAwarded]));
  const earned = new Map<string, number>(); // ponderado con xp_awarded (readiness)
  const coveredDone = new Map<string, number>(); // ponderado con xp base (cobertura)
  const coveredTotal = new Map<string, number>();

  for (const q of quests) {
    if (q.status === "archived") continue;
    const awarded = done.get(q.id);
    for (const s of q.skills) {
      if (awarded !== undefined) earned.set(s.code, (earned.get(s.code) ?? 0) + awarded * s.weight);
      if (q.status === "published") {
        coveredTotal.set(s.code, (coveredTotal.get(s.code) ?? 0) + q.xp * s.weight);
        if (awarded !== undefined) coveredDone.set(s.code, (coveredDone.get(s.code) ?? 0) + q.xp * s.weight);
      }
    }
  }

  const scores: SkillScore[] = skills.map((sk) => {
    const e = earned.get(sk.code) ?? 0;
    const total = coveredTotal.get(sk.code) ?? 0;
    return {
      code: sk.code,
      name: sk.name,
      core: sk.core,
      readiness: Math.min(100, Math.round((e / sk.targetXp) * 100)),
      coverage: total > 0 ? Math.min(100, Math.round(((coveredDone.get(sk.code) ?? 0) / total) * 100)) : null,
      earnedXp: Math.round(e),
      targetXp: sk.targetXp,
    };
  });

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const allCoveredTotal = [...coveredTotal.values()].reduce((a, b) => a + b, 0);
  const allCoveredDone = [...coveredDone.values()].reduce((a, b) => a + b, 0);
  const coreBelow = scores.filter((s) => s.core && s.readiness < READY_THRESHOLD);

  return {
    scores,
    globalReadiness: avg(scores.map((s) => s.readiness)),
    globalCoverage: allCoveredTotal ? Math.round((allCoveredDone / allCoveredTotal) * 100) : 0,
    readyToApply: coreBelow.length === 0,
    coreBelow,
  };
}
