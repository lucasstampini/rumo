import { APP_TIME_ZONE, type ISODate, weekday } from "./dates";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const BRL_INT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Centavos → "R$ 1.382" (mostra centavos só quando existem). */
export function brl(cents: number): string {
  const text = cents % 100 === 0 ? BRL_INT.format(cents / 100) : BRL.format(cents / 100);
  return text.replace(/ /g, " ");
}

/** 'YYYY-MM-DD' → 'dd/mm'. */
export function dateShort(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function weekdayShort(iso: ISODate): string {
  return WEEKDAYS_SHORT[weekday(iso)];
}

/** 'Sex 27/11'. */
export function dateWithWeekday(iso: ISODate): string {
  return `${weekdayShort(iso)} ${dateShort(iso)}`;
}

/** 'Sex 27/11 → Dom 29/11' (ou um dia só). */
export function dateRange(start: ISODate, end: ISODate): string {
  return start === end
    ? dateWithWeekday(start)
    : `${dateWithWeekday(start)} → ${dateWithWeekday(end)}`;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** 'YYYY-MM' → 'novembro'. */
export function monthName(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}
export function monthShort(key: string): string {
  return monthName(key).slice(0, 3);
}

/** 4.9 → '4,9'. */
export function rating(value: number | null | undefined): string {
  return value == null ? "Novo" : Number(value).toFixed(1).replace(".", ",");
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Instante → 'dd/mm às HH:MM' em São Paulo. */
export function dateTime(instant: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} às ${get("hour")}:${get("minute")}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function carName(car: { make: string; model: string; year: number }): string {
  return `${car.make} ${car.model} ${car.year}`;
}
