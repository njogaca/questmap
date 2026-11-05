import { exportProgress } from "@/lib/portability";
import { localDate } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Descarga todo el progreso como JSON (referencias por slug). */
export async function GET() {
  const data = await exportProgress();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="questmap-progreso-${localDate()}.json"`,
      "cache-control": "no-store",
    },
  });
}
