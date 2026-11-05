/**
 * Lógica PURA de desbloqueo y progreso (sin BD). Recibe el contenido y el progreso
 * y calcula el estado de cada zona, nivel y quest. Fácil de probar.
 */

export type ContentStatus = "published" | "outline" | "archived";
export type NodeState = "locked" | "available" | "in_progress" | "completed" | "outline";
export type QuestState = "locked" | "available" | "in_progress" | "completed";

export type ZoneIn = {
  id: number;
  slug: string;
  status: ContentStatus;
  unlockedFromStart: boolean;
};
export type LevelIn = { id: number; zoneId: number; number: number; status: ContentStatus };
export type QuestIn = { id: number; levelId: number; required: boolean; status: ContentStatus };
export type PrereqIn = { zoneId: number; requiresZoneId: number; requiresLevelNumber: number };
export type ProgressIn = { questId: number; status: "locked" | "available" | "in_progress" | "completed" };

export type LevelOut = {
  state: NodeState;
  unlocked: boolean;
  completed: boolean;
  requiredTotal: number;
  requiredDone: number;
};
export type ZoneOut = {
  state: NodeState;
  unlocked: boolean;
  /** 0–100, quests required publicadas completadas / total. */
  percent: number;
  levelsCompleted: number;
  missingPrereqs: PrereqIn[];
};

export type WorldProgress = {
  zones: Map<number, ZoneOut>;
  levels: Map<number, LevelOut>;
  quests: Map<number, QuestState>;
};

export function computeProgress(input: {
  zones: ZoneIn[];
  levels: LevelIn[];
  quests: QuestIn[];
  prereqs: PrereqIn[];
  progress: ProgressIn[];
}): WorldProgress {
  const zones = input.zones.filter((z) => z.status !== "archived");
  const levels = input.levels.filter((l) => l.status !== "archived");
  const quests = input.quests.filter((q) => q.status !== "archived");
  const progressByQuest = new Map(input.progress.map((p) => [p.questId, p.status]));

  const questsByLevel = new Map<number, QuestIn[]>();
  for (const q of quests) {
    const list = questsByLevel.get(q.levelId) ?? [];
    list.push(q);
    questsByLevel.set(q.levelId, list);
  }

  // 1) ¿Qué niveles están completos? (independiente del desbloqueo)
  //    Un nivel está completo si es published, tiene ≥1 quest required publicada y todas están completed.
  const levelCompleted = new Map<number, boolean>();
  const levelCounts = new Map<number, { total: number; done: number }>();
  for (const l of levels) {
    const req = (questsByLevel.get(l.id) ?? []).filter((q) => q.required && q.status === "published");
    const done = req.filter((q) => progressByQuest.get(q.id) === "completed").length;
    levelCounts.set(l.id, { total: req.length, done });
    levelCompleted.set(l.id, l.status === "published" && req.length > 0 && done === req.length);
  }

  const levelsByZone = new Map<number, LevelIn[]>();
  for (const l of levels) {
    const list = levelsByZone.get(l.zoneId) ?? [];
    list.push(l);
    levelsByZone.set(l.zoneId, list);
  }
  for (const list of levelsByZone.values()) list.sort((a, b) => a.number - b.number);

  /** ¿Están completos los niveles 1..n de la zona? (desbloqueo en cadena) */
  const zoneReachedLevel = (zoneId: number, n: number) => {
    const list = levelsByZone.get(zoneId) ?? [];
    for (let i = 1; i <= n; i++) {
      const l = list.find((x) => x.number === i);
      if (!l || !levelCompleted.get(l.id)) return false;
    }
    return true;
  };

  // 2) Zonas
  const zoneOut = new Map<number, ZoneOut>();
  const levelOut = new Map<number, LevelOut>();
  const questOut = new Map<number, QuestState>();

  for (const z of zones) {
    const prereqs = input.prereqs.filter((p) => p.zoneId === z.id);
    const missingPrereqs = prereqs.filter((p) => !zoneReachedLevel(p.requiresZoneId, p.requiresLevelNumber));
    // Sin prerrequisitos y sin unlocked_from_start = bloqueada (evita abrir zonas por error de configuración).
    const unlocked = z.unlockedFromStart || (prereqs.length > 0 && missingPrereqs.length === 0);

    const zl = levelsByZone.get(z.id) ?? [];
    let previousCompleted = true;
    let levelsCompleted = 0;
    let reqTotal = 0;
    let reqDone = 0;
    let anyStarted = false;

    for (const l of zl) {
      const counts = levelCounts.get(l.id)!;
      const completed = levelCompleted.get(l.id)!;
      const levelUnlocked = unlocked && l.status === "published" && previousCompleted;
      const levelQuests = questsByLevel.get(l.id) ?? [];
      const started = levelQuests.some((q) => {
        const p = progressByQuest.get(q.id);
        return p === "completed" || p === "in_progress";
      });
      anyStarted ||= started;

      let state: NodeState;
      if (l.status === "outline") state = "outline";
      else if (!levelUnlocked) state = "locked";
      else if (completed) state = "completed";
      else if (started) state = "in_progress";
      else state = "available";

      levelOut.set(l.id, { state, unlocked: levelUnlocked, completed, requiredTotal: counts.total, requiredDone: counts.done });

      for (const q of levelQuests) {
        const p = progressByQuest.get(q.id);
        let qs: QuestState;
        if (p === "completed") qs = "completed";
        else if (!levelUnlocked || q.status !== "published") qs = "locked";
        else if (p === "in_progress") qs = "in_progress";
        else qs = "available";
        questOut.set(q.id, qs);
      }

      if (completed) levelsCompleted++;
      reqTotal += counts.total;
      reqDone += counts.done;
      previousCompleted = completed;
    }

    const allLevelsDone = zl.length === 5 && levelsCompleted === 5;
    let state: NodeState;
    if (z.status === "outline") state = "outline";
    else if (!unlocked) state = "locked";
    else if (allLevelsDone) state = "completed";
    else if (anyStarted) state = "in_progress";
    else state = "available";

    zoneOut.set(z.id, {
      state,
      unlocked,
      percent: reqTotal ? Math.round((reqDone / reqTotal) * 100) : 0,
      levelsCompleted,
      missingPrereqs,
    });
  }

  return { zones: zoneOut, levels: levelOut, quests: questOut };
}
