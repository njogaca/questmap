/** Utilidades de fecha en la zona horaria del usuario (TZ). Fechas como "YYYY-MM-DD". */

export function userTz(): string {
  return process.env.TZ || "UTC";
}

/** Fecha local (YYYY-MM-DD) de un instante en la zona horaria dada. */
export function localDate(at: Date = new Date(), tz: string = userTz()): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Día de la semana local: 0 = domingo … 4 = jueves … 6 = sábado. */
export function localWeekday(at: Date = new Date(), tz: string = userTz()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Suma días a una fecha YYYY-MM-DD (aritmética de calendario, sin zonas). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana (lunes–domingo) que contiene la fecha. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
