"use client";

import { useEffect, useRef } from "react";
import { useEffectsPrefs } from "./prefs";

/**
 * Fondo de partículas al estilo de los arcade vectoriales (Asteroids, Galaga): rocas en wireframe
 * que giran despacio y un campo de estrellas que cae. Va MUY tenue a propósito — es ambiente, no
 * decoración: si se nota mientras lees, está mal calibrado.
 *
 * Decisiones que importan:
 * - Un solo <canvas> fijo detrás de todo (z-0 con el contenido en z-10), `pointer-events: none`.
 * - Los colores Y la opacidad salen de los tokens del tema, leídos del CSS, así que cambia con la
 *   interfaz sin saber nada de ella. El alfa es por tema a propósito: ver --qm-particle-alpha.
 * - Respeta la preferencia de animaciones: si están apagadas, no se monta el bucle siquiera.
 * - Se pausa cuando la pestaña no está visible, para no gastar batería de fondo.
 */

type Rock = { x: number; y: number; r: number; vx: number; vy: number; spin: number; a: number; pts: number[] };
type Star = { x: number; y: number; v: number; s: number };

const ROCKS = 9;
const STARS = 42;

export function ArcadeField() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { motion } = useEffectsPrefs();

  useEffect(() => {
    if (!motion) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rocks: Rock[] = [];
    const stars: Star[] = [];

    // El color del tema actual; si no se puede leer, un gris neutro que funciona en claro y oscuro.
    const token = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      rocks.length = 0;
      stars.length = 0;
      for (let i = 0; i < ROCKS; i++) {
        // Polígono irregular de 7-10 vértices: la silueta de roca de Asteroids.
        const n = 7 + Math.floor(Math.random() * 4);
        const pts = Array.from({ length: n }, () => 0.68 + Math.random() * 0.5);
        rocks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 22 + Math.random() * 46,
          vx: (Math.random() - 0.5) * 0.17,
          vy: (Math.random() - 0.5) * 0.17,
          spin: (Math.random() - 0.5) * 0.0022,
          a: Math.random() * Math.PI * 2,
          pts,
        });
      }
      for (let i = 0; i < STARS; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, v: 0.12 + Math.random() * 0.4, s: Math.random() < 0.18 ? 2 : 1 });
      }
    };

    const draw = () => {
      const line = token("--na-available", "#8899aa");
      const dim = token("--na-text-dim", "#8899aa");
      // El alfa lo fija cada tema: un valor fijo se veía en ctOS y desaparecía en Frostpunk y
      // Animus, porque lo que importa es el contraste contra ESE fondo, no el alfa en sí.
      const alpha = Number(token("--qm-particle-alpha", "0.24")) || 0.24;
      ctx.clearRect(0, 0, w, h);

      // Estrellas: caen despacio, como el campo de Galaga.
      ctx.fillStyle = dim;
      ctx.globalAlpha = alpha * 1.25;
      for (const s of stars) {
        s.y += s.v;
        if (s.y > h) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      // Rocas en wireframe: solo contorno, nunca relleno.
      ctx.strokeStyle = line;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      for (const r of rocks) {
        r.x += r.vx;
        r.y += r.vy;
        r.a += r.spin;
        // Envolver por los bordes, como en el arcade.
        const m = r.r + 8;
        if (r.x < -m) r.x = w + m;
        if (r.x > w + m) r.x = -m;
        if (r.y < -m) r.y = h + m;
        if (r.y > h + m) r.y = -m;

        ctx.beginPath();
        r.pts.forEach((k, i) => {
          const ang = r.a + (i / r.pts.length) * Math.PI * 2;
          const px = r.x + Math.cos(ang) * r.r * k;
          const py = r.y + Math.sin(ang) * r.r * k;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    seed();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [motion]);

  if (!motion) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
