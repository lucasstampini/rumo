/**
 * Regras de preço (SPEC §5). Tudo em centavos inteiros; formatar só na tela.
 * O trigger `bookings_before_insert` repete estas contas no banco — mude os dois juntos.
 */
import { diffDays, type ISODate } from "./dates";

export type ProtectionPlan = "basic" | "full";

export const MIN_DAYS = 1;
export const MAX_DAYS = 30;
export const FULL_PROTECTION_PER_DAY_CENTS = 2900; // R$ 29/dia
export const SERVICE_FEE_RATE = 0.1; // 10% de (subtotal + proteção)
export const OWNER_PAYOUT_RATE = 0.85; // dono recebe 85% do subtotal
export const RENTAL_COMPANY_MARKUP = 1.45; // "na locadora sairia ~45% mais caro"

/** Diárias: dias entre retirada e devolução, inclusivo (sex→dom = 3). */
export function countDays(start: ISODate, end: ISODate): number {
  return diffDays(start, end) + 1;
}

export function isValidDayCount(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;
}

export type Quote = {
  days: number;
  subtotalCents: number;
  protectionCents: number;
  serviceFeeCents: number;
  totalCents: number;
  ownerPayoutCents: number;
};

export function quote(input: {
  pricePerDayCents: number;
  days: number;
  protection: ProtectionPlan;
}): Quote {
  const { pricePerDayCents, days, protection } = input;
  if (!isValidDayCount(days)) {
    throw new RangeError(`Diárias fora do intervalo ${MIN_DAYS}–${MAX_DAYS}: ${days}`);
  }
  if (!Number.isInteger(pricePerDayCents) || pricePerDayCents <= 0) {
    throw new RangeError(`Preço por dia inválido: ${pricePerDayCents}`);
  }
  const subtotalCents = days * pricePerDayCents;
  const protectionCents = protection === "full" ? FULL_PROTECTION_PER_DAY_CENTS * days : 0;
  // 10%, arredondado para o real inteiro
  const serviceFeeCents =
    Math.round(((subtotalCents + protectionCents) * SERVICE_FEE_RATE) / 100) * 100;
  return {
    days,
    subtotalCents,
    protectionCents,
    serviceFeeCents,
    totalCents: subtotalCents + protectionCents + serviceFeeCents,
    ownerPayoutCents: Math.round(subtotalCents * OWNER_PAYOUT_RATE),
  };
}

export function quoteForDates(input: {
  pricePerDayCents: number;
  start: ISODate;
  end: ISODate;
  protection: ProtectionPlan;
}): Quote {
  return quote({
    pricePerDayCents: input.pricePerDayCents,
    days: countDays(input.start, input.end),
    protection: input.protection,
  });
}

/** Estimativa do mesmo período numa locadora tradicional, arredondada para a dezena de reais. */
export function rentalCompanyEstimateCents(totalCents: number): number {
  return Math.round((totalCents * RENTAL_COMPANY_MARKUP) / 1000) * 1000;
}

export type AnnualCosts = {
  annual_ipva_cents: number;
  annual_insurance_cents: number;
  annual_maintenance_cents: number;
  annual_depreciation_cents: number;
};

/** Custo mensal do carro = (IPVA + seguro + manutenção + depreciação anuais) ÷ 12. */
export function monthlyCostCents(costs: AnnualCosts): number {
  const annual =
    costs.annual_ipva_cents +
    costs.annual_insurance_cents +
    costs.annual_maintenance_cents +
    costs.annual_depreciation_cents;
  return Math.round(annual / 12);
}

/** % do custo mensal coberto pelos repasses do mês (inteiro; 0 se o carro não tem custo cadastrado). */
export function coveredPercent(payoutsCents: number, monthlyCost: number): number {
  if (monthlyCost <= 0) return 0;
  return Math.round((payoutsCents / monthlyCost) * 100);
}

/** Simulador: renda líquida/mês = dias × diária × 0,85. */
export function simulateMonthlyIncomeCents(daysRented: number, pricePerDayCents: number): number {
  return Math.round(daysRented * pricePerDayCents * OWNER_PAYOUT_RATE);
}
