"use server";

import { revalidatePath } from "next/cache";
import { setActiveTrack } from "@/lib/track";

type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

/**
 * Cambia la ruta que estoy cursando. Solo mueve el puntero `profile.active_track_id`:
 * no toca una sola fila de progreso, así que volver a la ruta anterior la deja como estaba.
 */
export async function activateTrack(trackId: number): Promise<{ ok: true } | Fail> {
  try {
    if (!Number.isInteger(trackId) || trackId <= 0) throw new Error("Ruta inválida.");
    await setActiveTrack(trackId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
