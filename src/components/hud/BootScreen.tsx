"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "qm.boot";
const STEP_MS = 220;

/**
 * Pantalla de arranque "ctOS": una vez al día, solo con las animaciones activadas.
 * El servidor la pinta siempre; un script inline en el layout decide antes del primer frame
 * (html[data-boot="done"]) si debe verse, para que no haya parpadeo de la página debajo.
 */
export function BootScreen({ sectors, xp }: { sectors: number; xp: number }) {
  const [shown, setShown] = useState(true);
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const lines = [
    "ctOS // QuestMap v0.1 — enlace seguro establecido",
    "autenticando operador .................. OK",
    `cargando atlas: ${sectors} sectores ............ OK`,
    `sincronizando progreso: ${xp.toLocaleString("es")} XP ........ OK`,
    "ACCESO CONCEDIDO",
  ];

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, new Date().toDateString());
    } catch {
      // sin almacenamiento: se mostrará otra vez en la próxima carga
    }
    document.documentElement.dataset.boot = "done";
    setLeaving(true);
    window.setTimeout(() => setShown(false), 350);
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.boot === "done") {
      setShown(false);
      return;
    }
    const timers = lines.map((_, i) => window.setTimeout(() => setCount(i + 1), 150 + i * STEP_MS));
    timers.push(window.setTimeout(finish, 150 + lines.length * STEP_MS + 600));
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shown) return null;
  return (
    <div className="qm-boot" data-leaving={leaving} onClick={finish} role="status" aria-label="Pantalla de arranque; haz clic para saltar">
      <div className="w-[min(92vw,560px)] font-mono text-sm">
        <p className="font-title text-3xl font-bold tracking-[0.25em] text-available">
          <span className="text-ink">[</span>QUEST<span className="text-ink">MAP]</span>
        </p>
        <ul className="mt-5 space-y-1.5">
          {lines.slice(0, count).map((l, i) => (
            <li key={i} className={`qm-boot-line ${i === lines.length - 1 ? "font-semibold text-done" : "text-dim"}`}>
              <span className="text-available">&gt;</span> {l}
            </li>
          ))}
          <li aria-hidden>
            <span className="qm-blink text-available">▮</span>
          </li>
        </ul>
        <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-dim">clic o cualquier tecla para saltar</p>
      </div>
    </div>
  );
}
