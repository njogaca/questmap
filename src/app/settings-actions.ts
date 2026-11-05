"use server";

import { revalidatePath } from "next/cache";
import { importProgress, resetZone } from "@/lib/portability";

type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export async function importProgressFile(
  form: FormData,
): Promise<{ ok: true; summary: Awaited<ReturnType<typeof importProgress>> } | Fail> {
  try {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Elige un archivo .json exportado por QuestMap.");
    if (file.size > MAX_IMPORT_BYTES) throw new Error("El archivo es demasiado grande (máximo 20 MB).");
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new Error("El archivo no es JSON válido.");
    }
    const summary = await importProgress(json);
    revalidatePath("/", "layout");
    return { ok: true, summary };
  } catch (e) {
    return fail(e);
  }
}

export async function resetZoneProgress(zoneSlug: string, confirmation: string): Promise<{ ok: true; quests: number } | Fail> {
  try {
    if (confirmation.trim() !== zoneSlug) throw new Error(`Para confirmar, escribe exactamente: ${zoneSlug}`);
    const r = await resetZone(zoneSlug);
    revalidatePath("/", "layout");
    return { ok: true, quests: r.quests };
  } catch (e) {
    return fail(e);
  }
}
