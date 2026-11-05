import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { localDate } from "../time";

/**
 * Modo B (API). La clave y el modelo vienen SOLO de variables de entorno del servidor:
 * ANTHROPIC_API_KEY y CLAUDE_MODEL. La clave nunca llega al navegador.
 */

export function apiConfig() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.CLAUDE_MODEL?.trim();
  const maxPerDay = Number(process.env.MAX_API_CALLS_PER_DAY ?? 50) || 50;
  return {
    configured: !!key && !!model,
    hasKey: !!key,
    model: model || null,
    maxPerDay,
  };
}

// Modelos con `output_config.effort` y con el parámetro server-side `fallbacks: "default"`.
const EFFORT_MODELS = /^claude-(fable-5|mythos-5|opus-5|opus-4-[678]|sonnet-5|sonnet-4-6|haiku-5)/;
const FALLBACK_MODELS = /^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/;

export async function usageToday() {
  const [row] = await db.select().from(s.apiUsage).where(eq(s.apiUsage.date, localDate()));
  return { calls: row?.calls ?? 0, tokens: row?.tokensApprox ?? 0 };
}

async function recordUsage(tokens: number) {
  await db
    .insert(s.apiUsage)
    .values({ date: localDate(), calls: 1, tokensApprox: tokens })
    .onConflictDoUpdate({
      target: s.apiUsage.date,
      set: {
        calls: sql`${s.apiUsage.calls} + 1`,
        tokensApprox: sql`${s.apiUsage.tokensApprox} + ${tokens}`,
      },
    });
}

export type ClaudeResult = { ok: true; text: string; tokens: number } | { ok: false; error: string };

let _client: Anthropic | null = null;
function client() {
  _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return _client;
}

/**
 * Una llamada a Claude. Nunca lanza: devuelve { ok: false, error } para que la UI
 * caiga al Modo A sin perder lo que escribió el usuario.
 */
export async function callClaude(input: {
  system?: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<ClaudeResult> {
  const cfg = apiConfig();
  if (!cfg.configured || !cfg.model) return { ok: false, error: "La API de Claude no está configurada (Modo A)." };

  const used = await usageToday();
  if (used.calls >= cfg.maxPerDay)
    return { ok: false, error: `Llegaste al tope de ${cfg.maxPerDay} llamadas a la API por hoy. Usa el Modo A.` };

  const model = cfg.model;
  try {
    const response = await client().beta.messages.create({
      model,
      max_tokens: input.maxTokens ?? 16000,
      ...(input.system
        ? { system: [{ type: "text" as const, text: input.system, cache_control: { type: "ephemeral" as const } }] }
        : {}),
      messages: input.messages,
      ...(EFFORT_MODELS.test(model) && input.effort ? { output_config: { effort: input.effort } } : {}),
      // Si el modelo declina por sus clasificadores de seguridad, la API reintenta con otro modelo.
      ...(FALLBACK_MODELS.test(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    const tokens = (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);
    await recordUsage(tokens);

    if (response.stop_reason === "refusal")
      return { ok: false, error: "Claude declinó responder esta solicitud. Prueba con el Modo A." };

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return { ok: false, error: "Claude devolvió una respuesta vacía. Prueba con el Modo A." };
    return { ok: true, text, tokens };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "La API key no es válida. Revisa ANTHROPIC_API_KEY." };
    if (err instanceof Anthropic.NotFoundError) return { ok: false, error: `El modelo "${model}" no existe. Revisa CLAUDE_MODEL.` };
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Límite de la API alcanzado. Intenta más tarde o usa el Modo A." };
    if (err instanceof Anthropic.BadRequestError) {
      if (/credit balance/i.test(err.message))
        return {
          ok: false,
          error: "Tu cuenta de la API de Anthropic no tiene créditos. Recárgalos en console.anthropic.com (Plans & Billing) o usa el Modo A.",
        };
      return { ok: false, error: `Petición rechazada por la API: ${err.message}` };
    }
    if (err instanceof Anthropic.APIError) return { ok: false, error: `Error de la API (${err.status ?? "?"}). Usa el Modo A.` };
    return { ok: false, error: "No se pudo conectar con la API de Claude. Usa el Modo A." };
  }
}
