import Link from "next/link";
import { PaletteButton } from "./CommandPalette";
import { HudClock } from "./HudClock";
import { NavLinks } from "./NavLinks";

export type HudData = {
  xp: number;
  rank: { name: string; percentToNext: number; nextName: string | null };
  streak: { current: number; todayDone: boolean };
} | null;

/** Barra superior estilo HUD: logo, secciones, lectura de rango/XP/racha, reloj y acceso a la terminal. */
export function HudNav({ data }: { data: HudData }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="hud-logo font-title text-xl font-bold tracking-widest" aria-label="QuestMap, inicio">
          <span className="text-available">[</span>QUEST<span className="text-available">MAP]</span>
        </Link>
        <NavLinks />
        <div className="hidden items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-dim md:flex">
          {data && (
            <>
              <span title={data.rank.nextName ? `Siguiente rango: ${data.rank.nextName}` : "Rango máximo"}>
                rango <b className="font-normal text-available">{data.rank.name}</b>
              </span>
              <span title="XP total">
                xp <b className="font-normal text-ink">{data.xp.toLocaleString("es")}</b>
              </span>
              <span title={data.streak.todayDone ? "Día de hoy contado" : "Hoy todavía no cuenta para la racha"}>
                racha{" "}
                <b className="font-normal" style={{ color: data.streak.todayDone ? "var(--na-done)" : "var(--na-warn)" }}>
                  {data.streak.current}d
                </b>
              </span>
            </>
          )}
          <HudClock />
          <PaletteButton />
        </div>
      </div>
      {data && (
        <div className="h-px w-full bg-surface-2" aria-hidden title="Progreso hacia el siguiente rango">
          <div className="h-px bg-available transition-[width] duration-700" style={{ width: `${data.rank.percentToNext}%` }} />
        </div>
      )}
    </header>
  );
}
