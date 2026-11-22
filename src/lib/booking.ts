/**
 * Ciclo de vida da reserva e disponibilidade (SPEC §5 e §6). Funções puras.
 * O trigger `bookings_before_update` aplica a mesma máquina de estados no banco.
 */
import { eachDay, type ISODate, weekday } from "./dates";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled";

export type Role = "renter" | "owner";

/** Status que ocupam as datas do carro. */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["requested", "accepted", "active"];

const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, Role>>> = {
  requested: { accepted: "owner", rejected: "owner", cancelled: "renter" },
  accepted: { active: "renter", cancelled: "renter" },
  active: { completed: "owner" },
  completed: {},
  rejected: {},
  cancelled: {},
};

/** Quem pode levar a reserva de `from` para `to` (ou null se a transição não existe). */
export function transitionRole(from: BookingStatus, to: BookingStatus): Role | null {
  return TRANSITIONS[from][to] ?? null;
}

export function canTransition(from: BookingStatus, to: BookingStatus, role: Role): boolean {
  return transitionRole(from, to) === role;
}

/** Recusa e cancelamento devolvem o pagamento (simulado). */
export function refundsPayment(to: BookingStatus): boolean {
  return to === "rejected" || to === "cancelled";
}

/** Períodos inclusivos [start, end] se sobrepõem? */
export function rangesOverlap(
  aStart: ISODate,
  aEnd: ISODate,
  bStart: ISODate,
  bEnd: ISODate,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export type DateRange = { start_date: ISODate; end_date: ISODate };

/** Alguma reserva que ocupa datas colide com o período pedido? */
export function hasDateConflict(
  existing: readonly (DateRange & { status?: BookingStatus })[],
  start: ISODate,
  end: ISODate,
): boolean {
  return existing.some(
    (b) =>
      (b.status === undefined || BLOCKING_STATUSES.includes(b.status)) &&
      rangesOverlap(b.start_date, b.end_date, start, end),
  );
}

export type Availability = {
  /** dias da semana liberados pelo dono (0 = domingo) */
  availableWeekdays: readonly number[];
  /** dias bloqueados manualmente */
  blockedDays?: readonly ISODate[];
  /** períodos já reservados */
  busyRanges?: readonly DateRange[];
  today: ISODate;
};

export type UnavailableReason = "past" | "weekday" | "blocked" | "busy";

/** Por que o dia não pode ser reservado (null = livre). */
export function unavailableReason(day: ISODate, a: Availability): UnavailableReason | null {
  if (day < a.today) return "past";
  if (!a.availableWeekdays.includes(weekday(day))) return "weekday";
  if (a.blockedDays?.includes(day)) return "blocked";
  if (a.busyRanges && hasDateConflict(a.busyRanges, day, day)) return "busy";
  return null;
}

/** O período inteiro está livre? */
export function isRangeAvailable(start: ISODate, end: ISODate, a: Availability): boolean {
  if (end < start) return false;
  return eachDay(start, end).every((d) => unavailableReason(d, a) === null);
}

/** Código de retirada: 4 dígitos (com zeros à esquerda). */
export function generatePickupCode(random: () => number = Math.random): string {
  return String(Math.floor(random() * 10_000) % 10_000).padStart(4, "0");
}

export const INSPECTION_ANGLES = ["front", "back", "left", "right"] as const;
export type InspectionAngle = (typeof INSPECTION_ANGLES)[number];
export type InspectionKind = "pickup" | "return";

export const ANGLE_LABEL: Record<InspectionAngle, string> = {
  front: "Frente",
  back: "Traseira",
  left: "Lado esq.",
  right: "Lado dir.",
};

/** A vistoria tem as 4 fotos? */
export function inspectionComplete(angles: readonly string[]): boolean {
  return INSPECTION_ANGLES.every((a) => angles.includes(a));
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Aguardando dono",
  accepted: "Confirmado",
  active: "Em andamento",
  completed: "Concluído",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

export type Tone = "amber" | "green" | "blue" | "gray" | "red";

export const STATUS_TONE: Record<BookingStatus, Tone> = {
  requested: "amber",
  accepted: "green",
  active: "blue",
  completed: "gray",
  rejected: "red",
  cancelled: "red",
};

/** Em qual aba de "Aluguéis" a reserva aparece. */
export function rentalTab(status: BookingStatus): "upcoming" | "active" | "past" {
  if (status === "active") return "active";
  if (status === "requested" || status === "accepted") return "upcoming";
  return "past";
}
