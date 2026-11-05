"use server";

import { revalidatePath } from "next/cache";
import { apiConfig } from "@/lib/claude/client";
import type { Grading } from "@/lib/claude/grading";
import type { InterviewMode } from "@/lib/claude/prompts";
import {
  applyEvaluation,
  completeReviewItem,
  evaluationPromptForSession,
  finishInterviewApi,
  interviewTurnApi,
  runEvaluationApi,
  startEvaluation,
  startInterview,
  submitInterviewManual,
  type ApplyResult,
} from "@/lib/claude/service";
import type { Reward } from "@/lib/game";

type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({ ok: false, error: e instanceof Error ? e.message : String(e) });
const refresh = () => revalidatePath("/", "layout");

export type GradeOutcome =
  | { ok: true; grading: Grading; passed: boolean; reward?: Reward }
  | { ok: false; error: string; needsEvaluation?: string };

function toOutcome(r: ApplyResult): GradeOutcome {
  refresh();
  return r;
}

/* ------------------------------------------------- open_answer / lab review */

export async function prepareEvaluation(
  kind: "open_answer" | "lab_review",
  questSlug: string,
  answer: string,
): Promise<{ ok: true; id: number; prompt: string; apiAvailable: boolean } | Fail> {
  try {
    const { id, prompt } = await startEvaluation(kind, questSlug, answer);
    return { ok: true, id, prompt, apiAvailable: apiConfig().configured };
  } catch (e) {
    return fail(e);
  }
}

export async function gradeEvaluationWithApi(id: number): Promise<GradeOutcome> {
  try {
    return toOutcome(await runEvaluationApi(id));
  } catch (e) {
    return fail(e);
  }
}

export async function submitEvaluationResponse(id: number, pasted: string): Promise<GradeOutcome> {
  try {
    return toOutcome(await applyEvaluation(id, pasted, "manual"));
  } catch (e) {
    return fail(e);
  }
}

/* --------------------------------------------------------------- entrevistas */

export async function createInterview(input: {
  mode?: InterviewMode;
  templateSlug?: string;
  questSlug?: string;
  deliverable?: string;
}): Promise<{ ok: true; id: number } | Fail> {
  try {
    const id = await startInterview(input);
    refresh();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function interviewNextTurn(sessionId: number, answer?: string): Promise<{ ok: true } | Fail> {
  try {
    const r = await interviewTurnApi(sessionId, answer);
    refresh();
    return r;
  } catch (e) {
    return fail(e);
  }
}

export async function interviewFinishWithApi(sessionId: number): Promise<GradeOutcome> {
  try {
    return toOutcome(await finishInterviewApi(sessionId));
  } catch (e) {
    return fail(e);
  }
}

export async function interviewSubmitManual(sessionId: number, pasted: string): Promise<GradeOutcome> {
  try {
    return toOutcome(await submitInterviewManual(sessionId, pasted));
  } catch (e) {
    return fail(e);
  }
}

export async function interviewEvaluationPrompt(sessionId: number): Promise<{ ok: true; prompt: string } | Fail> {
  try {
    return { ok: true, prompt: await evaluationPromptForSession(sessionId) };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ refuerzos */

export async function markReviewDone(id: number, minutes: number): Promise<{ ok: true; badges: string[] } | Fail> {
  try {
    const badges = await completeReviewItem(id, minutes);
    refresh();
    return { ok: true, badges };
  } catch (e) {
    return fail(e);
  }
}
