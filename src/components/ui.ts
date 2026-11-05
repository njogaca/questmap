/** Clases de botón compartidas (módulo neutro: sirve en server y client components). */
export const btn =
  "inline-flex items-center justify-center rounded border px-4 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} border-available text-available hover:bg-available hover:text-bg`;
export const btnGhost = `${btn} border-line text-dim hover:border-ink hover:text-ink`;
