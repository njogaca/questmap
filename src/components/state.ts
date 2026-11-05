import type { NodeState, QuestState } from "@/lib/progress";

/** Color de cada estado (tokens Neon Atlas). */
export const STATE_COLOR: Record<NodeState, string> = {
  locked: "var(--na-locked)",
  available: "var(--na-available)",
  in_progress: "var(--na-progress)",
  completed: "var(--na-done)",
  outline: "var(--na-locked)",
};

export const STATE_TEXT: Record<NodeState, string> = {
  locked: "Bloqueado",
  available: "Disponible",
  in_progress: "En progreso",
  completed: "Completado",
  outline: "Próximamente",
};

export const QUEST_STATE_TEXT: Record<QuestState, string> = {
  locked: "Bloqueada",
  available: "Disponible",
  in_progress: "En progreso",
  completed: "Completada",
};

export const QUEST_TYPE_TEXT: Record<string, string> = {
  learn: "Aprender",
  glossary: "Glosario",
  lab: "Laboratorio",
  quiz: "Quiz",
  open_answer: "Respuesta abierta",
  interview: "Entrevista",
  boss: "Jefe",
  micro: "Micro",
};
