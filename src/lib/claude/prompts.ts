/**
 * Prompts para Claude. Los mismos textos se usan en Modo A (copiar/pegar) y Modo B (API).
 * Reglas del SPEC: directo y crítico, sin adulación; errores explicados en español simple;
 * correcciones de inglés con la versión mejor + por qué; la oferta de trabajo como contexto.
 */

export const JOB_CONTEXT = `Target role: Home Depot — Software Engineer, Backend & Distributed Systems (Remote), Req197061.
Preferred qualifications: object-oriented language (preferably Java); event-driven architectures and queues/streaming (Google Cloud Pub/Sub); NoSQL with Apache Cassandra at high throughput; BigQuery and SQL on large datasets; Prometheus and Grafana metrics and alerting; using AI tools in development; microservices on the cloud (GCP preferred); CI/CD; Git; debugging and root-cause analysis; authentication and authorization of users and services; unit, functional, destructive and performance testing.`;

export const CANDIDATE_CONTEXT = `Candidate: Johan, Integration Engineer with 8+ years in IBM IIB and IBM MQ at a tier-one bank (DataPower, WSRR, Docker/OpenShift, CI/CD, Git). He is moving into modern Java, GCP, Pub/Sub and Cassandra. His native language is Spanish; his English is functional but limited.`;

const FEEDBACK_RULES = `Feedback rules:
- Be direct and critical. No flattery, no generic praise. If something is wrong or shallow, say so.
- Write every comment, gap and next step in SIMPLE SPANISH (the candidate's native language).
- In "english_feedback", quote up to 5 sentences the candidate wrote in English that should be improved: "original" (exactly as written), "better" (natural, interview-ready English) and "why_es" (short reason in Spanish). If there is no English to correct, return an empty array.
- "gaps" are short topic names in Spanish to review (max 5).
- Scores are 0–100. 70+ means "would pass this part of a real interview at this company".`;

export const GRADING_JSON_SPEC = `End your reply with ONE fenced JSON block exactly in this shape (no comments, valid JSON):
\`\`\`json
{
  "score": 0,
  "criteria": [
    {"name": "correctness", "score": 0, "comment": "..."},
    {"name": "depth", "score": 0, "comment": "..."},
    {"name": "clarity", "score": 0, "comment": "..."},
    {"name": "tradeoffs", "score": 0, "comment": "..."}
  ],
  "english_feedback": [{"original": "...", "better": "...", "why_es": "..."}],
  "gaps": ["..."],
  "next_step": "..."
}
\`\`\``;

export type GradingKind = "open_answer" | "lab_review";

export function gradingPrompt(input: {
  kind: GradingKind;
  questTitle: string;
  zoneTitle: string;
  question: string;
  answer: string;
  extraContext?: string;
}): string {
  const task =
    input.kind === "lab_review"
      ? `You are a senior backend engineer reviewing the evidence of a hands-on lab. Check whether the evidence actually proves the lab goals were met, point out anything suspicious, missing or incorrect, and explain how to verify it properly.`
      : `You are a senior backend interviewer at Home Depot grading a written answer to an open interview question. Grade it as you would in a real interview loop.`;
  return `${task}

${JOB_CONTEXT}

${CANDIDATE_CONTEXT}

Study area: ${input.zoneTitle} — ${input.questTitle}

${input.kind === "lab_review" ? "Lab description" : "Question"}:
"""
${input.question}
"""
${input.extraContext ? `\nAdditional context:\n"""\n${input.extraContext}\n"""\n` : ""}
${input.kind === "lab_review" ? "Candidate's evidence" : "Candidate's answer"}:
"""
${input.answer}
"""

First write a short review (in Spanish, max ~200 words): what is right, what is wrong or missing, and what a strong answer would include.

${FEEDBACK_RULES}

${GRADING_JSON_SPEC}`;
}

/* ------------------------------------------------------------- entrevistas */

export type InterviewMode = "behavioral" | "technical_screen" | "system_design" | "coding_task" | "mock_loop" | "boss";

export const MODE_LABEL: Record<InterviewMode, string> = {
  behavioral: "Behavioral (STAR)",
  technical_screen: "Technical screen",
  system_design: "System design",
  coding_task: "Coding task",
  mock_loop: "Mock loop",
  boss: "Jefe de zona",
};

export type InterviewContext = {
  mode: InterviewMode;
  title: string;
  zoneTitle?: string;
  questions?: string[];
  statement?: string;
  deliverable?: string;
  focus?: string[];
  durationMin?: number;
};

function plan(ctx: InterviewContext): string {
  const lines: string[] = [];
  if (ctx.statement) lines.push(`Problem statement given to the candidate:\n"""\n${ctx.statement}\n"""`);
  if (ctx.deliverable) lines.push(`Candidate's deliverable (code link, design or text):\n"""\n${ctx.deliverable}\n"""`);
  if (ctx.questions?.length) lines.push(`Questions to cover, in this order (adapt wording, ask follow-ups):\n${ctx.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`);
  if (ctx.focus?.length) lines.push(`Focus areas: ${ctx.focus.join("; ")}.`);
  return lines.join("\n\n");
}

const MODE_INSTRUCTIONS: Record<InterviewMode, string> = {
  behavioral: "Behavioral interview. Ask each question, expect STAR answers (Situation, Task, Action, Result). If the answer lacks a concrete result, personal ownership (\"I\" vs \"we\") or numbers, ask ONE follow-up to dig in.",
  technical_screen: "Technical screen. Ask conceptual questions one at a time. After each answer ask at most one or two follow-ups that probe depth, edge cases or trade-offs. Never give the correct answer.",
  system_design: "System design interview (30–45 min). Start by asking the candidate to clarify requirements and propose a high-level design. Then probe data model, scaling, failure handling, delivery guarantees, observability and trade-offs. The candidate may answer with text and Mermaid diagrams.",
  coding_task: "Take-home review. Review the candidate's code or repository link as a code reviewer would, then ask questions about design decisions, testing, error handling and what they would change for production.",
  mock_loop: "Full mock loop (45–60 min) in three parts: (1) technical screen questions, (2) behavioral questions, (3) a short system design discussion. Announce each part briefly before starting it.",
  boss: "Zone boss interview. First, briefly review the candidate's deliverable (2–4 sentences, as an interviewer would). Then run a mini-interview about it: ask 4–6 questions one at a time with follow-ups on the focus areas.",
};

/** System prompt para Modo B (Claude actúa como entrevistador turno a turno). */
export function interviewerSystemPrompt(ctx: InterviewContext): string {
  return `You are a professional interviewer at Home Depot for the role below, conducting a realistic remote interview in English.

${JOB_CONTEXT}

${CANDIDATE_CONTEXT}

Interview: ${ctx.title}${ctx.zoneTitle ? ` (${ctx.zoneTitle})` : ""}.
${MODE_INSTRUCTIONS[ctx.mode]}

${plan(ctx)}

Rules:
- Speak only English, in a professional, friendly but demanding tone. Use clear, simple sentences: the candidate is not a native speaker.
- Ask ONE question per turn. Wait for the answer. Ask for trade-offs. Do not give the answers or teach during the interview.
- Do not grade or give feedback during the interview.
- When you have covered the plan, say exactly "That's all my questions — thank you." and nothing else after it.`;
}

/** Prompt único para Modo A: Claude hace la entrevista en claude.ai y al final califica. */
export function interviewScriptPrompt(ctx: InterviewContext): string {
  return `${interviewerSystemPrompt(ctx)}

How we will run this in this chat:
1. Start now with a one-line greeting and your first question. Then wait for my answer each time.
2. When the interview is over (after "That's all my questions — thank you."), and ONLY then, switch role: become an evaluator and grade the whole interview.

Evaluation:
- Write a short evaluation in Spanish: the top 3 things to improve, concrete and actionable.
${FEEDBACK_RULES}

${GRADING_JSON_SPEC}`;
}

/** Prompt de evaluación de una transcripción (Modo B al terminar, o Modo A si la respuesta no trajo JSON). */
export function interviewEvaluationPrompt(ctx: InterviewContext, transcript: string): string {
  return `You are a senior interviewer at Home Depot. Grade the following interview for the role below.

${JOB_CONTEXT}

${CANDIDATE_CONTEXT}

Interview: ${ctx.title}${ctx.zoneTitle ? ` (${ctx.zoneTitle})` : ""} — mode: ${ctx.mode}.
${plan(ctx)}

Transcript (Interviewer / Candidate):
"""
${transcript}
"""

First write a short evaluation in Spanish with the TOP 3 things to improve, concrete and actionable.

${FEEDBACK_RULES}

${GRADING_JSON_SPEC}`;
}

export function transcriptText(turns: { role: string; content: string }[]): string {
  return turns
    .map((t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n\n");
}

export const INTERVIEW_END_MARKER = "That's all my questions";
