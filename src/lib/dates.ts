/**
 * Datas de calendário como string ISO 'YYYY-MM-DD' (igual ao tipo `date` do Postgres).
 * Toda a aritmética é feita em UTC para não depender do fuso da máquina.
 */

export const APP_TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;

export type ISODate = string;

const toUTC = (iso: ISODate) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);

export function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUTC(toUTC(value)) === value;
}

/** Data de hoje em São Paulo. */
export function todayISO(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: ISODate, n: number): ISODate {
  return fromUTC(toUTC(iso) + n * DAY_MS);
}

/** Diferença em dias (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(iso: ISODate): number {
  return new Date(toUTC(iso)).getUTCDay();
}

/** Todos os dias de `start` a `end`, inclusive. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 'YYYY-MM' do instante, em São Paulo. */
export function monthKey(instant: Date | string): string {
  return todayISO(typeof instant === "string" ? new Date(instant) : instant).slice(0, 7);
}

/** Desloca um 'YYYY-MM' em n meses. */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Sexta-feira da semana que vem (semana começa na segunda). */
export function nextWeekFriday(today: ISODate): ISODate {
  const daysToNextMonday = ((8 - weekday(today)) % 7) || 7;
  return addDays(today, daysToNextMonday + 4);
}
