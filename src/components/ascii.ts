/** Barra de progreso en texto para la interfaz Terminal: [#######-------]. Módulo neutro (sirve en server y client). */
export function asciiBar(percent: number, width = 20): string {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}
