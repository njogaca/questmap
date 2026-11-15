"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEffectsPrefs } from "../effects/prefs";

const KEY = "qm.boot";
const STEP_MS = 190;

type Line = { text: string; tone: "cmd" | "out" | "ok" };

/**
 * Pantalla de arranque: una vez al día, solo con las animaciones activadas.
 * HUD: "ctOS // acceso concedido". Terminal: una sesión ssh ("hello, friend.").
 * El servidor la pinta siempre; un script inline en el layout decide antes del primer frame
 * (html[data-boot="done"]) si debe verse, para que no haya parpadeo de la página debajo.
 */
export function BootScreen({ sectors, xp }: { sectors: number; xp: number }) {
  const { ui } = useEffectsPrefs();
  const [shown, setShown] = useState(true);
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);
  const terminal = ui === "terminal";
  const xpText = xp.toLocaleString("es");

  // Las líneas solo se pintan en el cliente (count empieza en 0), así que la fecha no rompe la hidratación.
  const lines: Line[] = terminal
    ? [
        { text: "$ ssh friend@questmap", tone: "cmd" },
        { text: `Last login: ${new Date().toDateString()} from 127.0.0.1`, tone: "out" },
        { text: "friend@questmap:~$ whoami", tone: "cmd" },
        { text: "friend", tone: "out" },
        { text: "friend@questmap:~$ ls ~/sectores | wc -l", tone: "cmd" },
        { text: String(sectors), tone: "out" },
        { text: "friend@questmap:~$ cat ~/.xp", tone: "cmd" },
        { text: xpText, tone: "out" },
        { text: "hello, friend.", tone: "ok" },
      ]
    : [
        { text: "ctOS // QuestMap v0.1 — enlace seguro establecido", tone: "out" },
        { text: "autenticando operador .................. OK", tone: "out" },
        { text: `cargando atlas: ${sectors} sectores ............ OK`, tone: "out" },
        { text: `sincronizando progreso: ${xpText} XP ........ OK`, tone: "out" },
        { text: "ACCESO CONCEDIDO", tone: "ok" },
      ];

  const stop = () => {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
  };

  const finish = useCallback(() => {
    stop();
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
    timer.current = window.setInterval(() => setCount((c) => c + 1), STEP_MS);
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  // Cuando ya se escribieron todas las líneas, espera un momento y entra.
  useEffect(() => {
    if (!shown || leaving || count < lines.length) return;
    stop();
    const t = window.setTimeout(finish, 700);
    return () => window.clearTimeout(t);
  }, [count, lines.length, shown, leaving, finish]);

  if (!shown) return null;
  return (
    <div className="qm-boot" data-leaving={leaving} onClick={finish} role="status" aria-label="Pantalla de arranque; haz clic para saltar">
      <div className="w-[min(92vw,560px)] font-mono text-sm">
        <p className="ui-hud font-title text-3xl font-bold tracking-[0.25em] text-available">
          <span className="text-ink">[</span>QUEST<span className="text-ink">MAP]</span>
        </p>
        <ul className="mt-5 space-y-1.5">
          {lines.slice(0, count).map((l, i) => (
            <li
              key={`${ui}-${i}`}
              className={`qm-boot-line ${l.tone === "ok" ? "font-semibold text-done" : l.tone === "cmd" ? "text-ink" : "text-dim"}`}
            >
              {!terminal && <span className="text-available">&gt; </span>}
              {l.text}
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
