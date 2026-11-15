/** Clases de botón compartidas (módulo neutro: sirve en server y client components). Estilo ctOS: angular, mono, mayúsculas. */
export const btn =
  "hud-btn inline-flex items-center justify-center border px-4 py-2 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} border-available bg-available/10 text-available hover:bg-available hover:text-bg`;
export const btnGhost = `${btn} border-line text-dim hover:border-ink hover:text-ink`;
