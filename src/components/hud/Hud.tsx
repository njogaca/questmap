import { getStreak, getXpTotal } from "@/lib/game";
import { loadWorld } from "@/lib/world";
import { rankFor } from "@/lib/xp";
import { BootScreen } from "./BootScreen";
import { CommandPalette, type PaletteZone } from "./CommandPalette";
import { HudNav } from "./HudNav";

async function loadHud() {
  try {
    const [xp, streak, world] = await Promise.all([getXpTotal(), getStreak(), loadWorld()]);
    const zones: PaletteZone[] = world.zones.map((z) => ({
      slug: z.slug,
      title: z.title,
      emoji: z.emoji,
      order: z.order,
      locked: z.progress.state === "locked",
      percent: z.progress.percent,
    }));
    return {
      xp,
      rank: rankFor(xp),
      streak: { current: streak.current, todayDone: streak.todayDone },
      zones,
    };
  } catch {
    // Sin base de datos (p. ej. durante el arranque): el HUD se muestra sin datos y la app no se cae.
    return null;
  }
}

/** Capa HUD compartida por todas las páginas: barra superior, terminal de comandos y pantalla de arranque. */
export async function Hud() {
  const d = await loadHud();
  return (
    <>
      <HudNav data={d ? { xp: d.xp, rank: d.rank, streak: d.streak } : null} />
      <CommandPalette zones={d?.zones ?? []} />
      <BootScreen sectors={d?.zones.length ?? 0} xp={d?.xp ?? 0} />
    </>
  );
}
