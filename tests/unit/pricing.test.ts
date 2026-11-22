import { describe, expect, it } from "vitest";
import {
  countDays,
  coveredPercent,
  isValidDayCount,
  monthlyCostCents,
  quote,
  quoteForDates,
  rentalCompanyEstimateCents,
  simulateMonthlyIncomeCents,
} from "@/lib/pricing";

describe("diárias", () => {
  it("sexta → domingo são 3 diárias (inclusivo)", () => {
    // 27/11/2026 é sexta, 29/11/2026 é domingo
    expect(countDays("2026-11-27", "2026-11-29")).toBe(3);
  });

  it("retirada e devolução no mesmo dia é 1 diária", () => {
    expect(countDays("2026-11-27", "2026-11-27")).toBe(1);
  });

  it("conta certo atravessando mês e ano", () => {
    expect(countDays("2026-12-30", "2027-01-02")).toBe(4);
  });

  it("aceita de 1 a 30 diárias", () => {
    expect(isValidDayCount(1)).toBe(true);
    expect(isValidDayCount(30)).toBe(true);
    expect(isValidDayCount(0)).toBe(false);
    expect(isValidDayCount(31)).toBe(false);
    expect(isValidDayCount(2.5)).toBe(false);
  });

  it("recusa orçamento fora do intervalo", () => {
    expect(() => quote({ pricePerDayCents: 11900, days: 31, protection: "basic" })).toThrow(RangeError);
    expect(() => quote({ pricePerDayCents: 11900, days: 0, protection: "basic" })).toThrow(RangeError);
    expect(() => quoteForDates({ pricePerDayCents: 11900, start: "2026-11-29", end: "2026-11-27", protection: "basic" })).toThrow(RangeError);
  });
});

describe("orçamento", () => {
  it("Onix, 4 diárias + proteção completa = R$ 651", () => {
    const q = quote({ pricePerDayCents: 11900, days: 4, protection: "full" });
    expect(q.subtotalCents).toBe(47600); // 4 × 119
    expect(q.protectionCents).toBe(11600); // 4 × 29
    expect(q.serviceFeeCents).toBe(5900); // 10% de 592 = 59,2 → 59
    expect(q.totalCents).toBe(65100);
  });

  it("proteção básica não custa nada", () => {
    const q = quote({ pricePerDayCents: 8900, days: 3, protection: "basic" });
    expect(q.protectionCents).toBe(0);
    expect(q.subtotalCents).toBe(26700);
    expect(q.serviceFeeCents).toBe(2700); // 26,7 → 27
    expect(q.totalCents).toBe(29400);
  });

  it("taxa de serviço arredonda para o real inteiro (para cima e para baixo)", () => {
    // 1 × 119 = 119 → 11,9 → 12
    expect(quote({ pricePerDayCents: 11900, days: 1, protection: "basic" }).serviceFeeCents).toBe(1200);
    // 1 × 79 = 79 → 7,9 → 8
    expect(quote({ pricePerDayCents: 7900, days: 1, protection: "basic" }).serviceFeeCents).toBe(800);
    // 2 × 109 + 2 × 29 = 276 → 27,6 → 28
    expect(quote({ pricePerDayCents: 10900, days: 2, protection: "full" }).serviceFeeCents).toBe(2800);
    // 1 × 219 + 29 = 248 → 24,8 → 25 ; 3 × 104 = 312 → 31,2 → 31
    expect(quote({ pricePerDayCents: 21900, days: 1, protection: "full" }).serviceFeeCents).toBe(2500);
    expect(quote({ pricePerDayCents: 10400, days: 3, protection: "basic" }).serviceFeeCents).toBe(3100);
  });

  it("taxa incide sobre subtotal + proteção", () => {
    const basic = quote({ pricePerDayCents: 10000, days: 10, protection: "basic" });
    const full = quote({ pricePerDayCents: 10000, days: 10, protection: "full" });
    expect(basic.serviceFeeCents).toBe(10000);
    expect(full.serviceFeeCents).toBe(12900);
  });

  it("repasse ao dono é 85% do subtotal, sem proteção nem taxa", () => {
    const basic = quote({ pricePerDayCents: 11900, days: 3, protection: "basic" });
    const full = quote({ pricePerDayCents: 11900, days: 3, protection: "full" });
    expect(basic.ownerPayoutCents).toBe(30345); // 357 × 0,85 = 303,45
    expect(full.ownerPayoutCents).toBe(basic.ownerPayoutCents);
  });

  it("total = subtotal + proteção + taxa, sempre em centavos inteiros", () => {
    for (const price of [7900, 8900, 11950, 21999]) {
      for (const days of [1, 2, 7, 30]) {
        for (const protection of ["basic", "full"] as const) {
          const q = quote({ pricePerDayCents: price, days, protection });
          expect(q.totalCents).toBe(q.subtotalCents + q.protectionCents + q.serviceFeeCents);
          for (const v of Object.values(q)) expect(Number.isInteger(v)).toBe(true);
          expect(q.serviceFeeCents % 100).toBe(0);
        }
      }
    }
  });

  it("orçamento por datas usa a contagem inclusiva", () => {
    const q = quoteForDates({ pricePerDayCents: 8900, start: "2026-11-27", end: "2026-11-29", protection: "basic" });
    expect(q.days).toBe(3);
    expect(q.subtotalCents).toBe(26700);
  });

  it("comparação com locadora: ~45% a mais, na dezena de reais", () => {
    expect(rentalCompanyEstimateCents(65100)).toBe(94000); // 651 × 1,45 = 943,95 → 940
    expect(rentalCompanyEstimateCents(29400)).toBe(43000); // 426,3 → 430
  });
});

describe("painel do dono", () => {
  const argo = {
    annual_ipva_cents: 210000,
    annual_insurance_cents: 340000,
    annual_maintenance_cents: 180000,
    annual_depreciation_cents: 650000,
  };

  it("custo mensal = custos anuais ÷ 12 (Argo = R$ 1.150)", () => {
    expect(monthlyCostCents(argo)).toBe(115000);
  });

  it("% coberto no mês", () => {
    expect(coveredPercent(138200, 115000)).toBe(120);
    expect(coveredPercent(57500, 115000)).toBe(50);
    expect(coveredPercent(0, 115000)).toBe(0);
  });

  it("carro sem custo cadastrado não divide por zero", () => {
    expect(coveredPercent(50000, 0)).toBe(0);
  });

  it("simulador: dias × diária × 0,85", () => {
    expect(simulateMonthlyIncomeCents(12, 12000)).toBe(122400); // R$ 1.224
    expect(simulateMonthlyIncomeCents(1, 6000)).toBe(5100);
  });
});
