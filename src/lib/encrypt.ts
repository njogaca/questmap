const GLYPHS = "▓▒░#$%&*+=<>/|01XZ";

/**
 * Texto "cifrado" estático y determinista (igual en servidor y cliente):
 * oculta con glifos la proporción `1 - revealed` de las letras.
 * Se usa para los sectores bloqueados del mapa: se descifran al cumplir sus requisitos.
 */
export function encrypt(text: string, revealed: number): string {
  const r = Math.max(0, Math.min(1, revealed));
  let seed = 0;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return text
    .split("")
    .map((ch) => {
      if (ch === " " || ch === "·") return ch;
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const keep = (seed % 1000) / 1000 < r;
      return keep ? ch : GLYPHS[(seed >>> 8) % GLYPHS.length];
    })
    .join("");
}

/** Qué tanto se "descifró" un sector bloqueado: proporción de requisitos cumplidos (máx. 70 % hasta abrirse). */
export function decryptRatio(prereqs: { met: boolean }[]): number {
  if (!prereqs.length) return 0.15;
  return 0.15 + 0.55 * (prereqs.filter((p) => p.met).length / prereqs.length);
}
