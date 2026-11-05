"use client";

import { useEffect, useState } from "react";
import { useEffectsPrefs } from "./prefs";

const GLYPHS = "▓▒░#$%&*+=<>/\\|01ABCDEFXZ";

/** Texto que se "descifra": arranca como glifos aleatorios y revela las letras de izquierda a derecha. */
export function DecryptText({ text, durationMs = 900, className }: { text: string; durationMs?: number; className?: string }) {
  const { motion } = useEffectsPrefs();
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!motion) {
      setShown(text);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const revealed = Math.floor(p * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < revealed || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs, motion]);

  return (
    <span className={className} aria-label={text}>
      {shown}
    </span>
  );
}
