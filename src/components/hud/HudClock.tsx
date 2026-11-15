"use client";

import { useEffect, useState } from "react";

/** Reloj local del HUD. Se pinta solo en el cliente para no desincronizar la hidratación. */
export function HudClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-ink" aria-label="Hora local">
      {time ?? "--:--:--"}
    </span>
  );
}
