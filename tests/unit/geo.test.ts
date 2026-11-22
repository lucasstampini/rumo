import { describe, expect, it } from "vitest";
import { haversineMeters, isInsideBubble, offsetMeters, walkMinutes } from "@/lib/geo";
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  isISODate,
  nextWeekFriday,
  todayISO,
  weekday,
} from "@/lib/dates";

const BUTANTA = { center_lat: -23.5614, center_lng: -46.723, radius_m: 1500 };
const CENTER = { lat: BUTANTA.center_lat, lng: BUTANTA.center_lng };

describe("distância", () => {
  it("zero para o mesmo ponto", () => {
    expect(haversineMeters(CENTER, CENTER)).toBe(0);
  });

  it("um grau de latitude ≈ 111 km", () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("offsetMeters anda a distância pedida", () => {
    for (const bearing of [0, 90, 200, 315]) {
      const p = offsetMeters(CENTER, 500, bearing);
      expect(haversineMeters(CENTER, p)).toBeCloseTo(500, -1);
    }
  });
});

describe("minutos a pé", () => {
  it("linha reta × 1,3 ÷ 80 m/min, arredondado para cima", () => {
    // 110 m → 1,79 → 2 min ; 170 m → 2,76 → 3 ; 530 m → 8,6 → 9
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 110, 200))).toBe(2);
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 170, 40))).toBe(3);
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 530, 215))).toBe(9);
  });

  it("nunca mostra menos de 1 minuto", () => {
    expect(walkMinutes(CENTER, CENTER)).toBe(1);
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 5, 0))).toBe(1);
  });

  it("10 minutos cobrem ~615 m", () => {
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 600, 90))).toBe(10);
    expect(walkMinutes(CENTER, offsetMeters(CENTER, 640, 90))).toBe(11);
  });
});

describe("bolha", () => {
  it("o centro e pontos próximos estão dentro", () => {
    expect(isInsideBubble(CENTER, BUTANTA)).toBe(true);
    expect(isInsideBubble(offsetMeters(CENTER, 1400, 45), BUTANTA)).toBe(true);
  });

  it("além do raio está fora", () => {
    expect(isInsideBubble(offsetMeters(CENTER, 1600, 45), BUTANTA)).toBe(false);
    // Av. Paulista fica a ~7 km
    expect(isInsideBubble({ lat: -23.5614, lng: -46.6559 }, BUTANTA)).toBe(false);
  });
});

describe("datas", () => {
  it("valida o formato ISO e datas impossíveis", () => {
    expect(isISODate("2026-11-27")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("27/11/2026")).toBe(false);
    expect(isISODate("2026-11-27T10:00")).toBe(false);
  });

  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-11-29", 2)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-11-27", "2026-11-29")).toBe(2);
  });

  it("dia da semana: 0 = domingo", () => {
    expect(weekday("2026-11-22")).toBe(0);
    expect(weekday("2026-11-27")).toBe(5);
  });

  it("lista os dias do período, inclusive", () => {
    expect(eachDay("2026-11-27", "2026-11-29")).toEqual(["2026-11-27", "2026-11-28", "2026-11-29"]);
    expect(eachDay("2026-11-27", "2026-11-27")).toEqual(["2026-11-27"]);
  });

  it("hoje segue o fuso de São Paulo, não o UTC", () => {
    // 01:30 UTC do dia 23 ainda é dia 22 em São Paulo (UTC−3)
    expect(todayISO(new Date("2026-11-23T01:30:00Z"))).toBe("2026-11-22");
    expect(todayISO(new Date("2026-11-23T03:30:00Z"))).toBe("2026-11-23");
  });

  it("sexta da semana que vem", () => {
    expect(nextWeekFriday("2026-11-22")).toBe("2026-11-27"); // domingo → sexta seguinte
    expect(nextWeekFriday("2026-11-23")).toBe("2026-12-04"); // segunda → sexta da outra semana
    expect(nextWeekFriday("2026-11-27")).toBe("2026-12-04"); // sexta → próxima sexta
    for (const d of ["2026-11-22", "2026-11-25", "2026-11-28"]) {
      expect(weekday(nextWeekFriday(d))).toBe(5);
    }
  });

  it("desloca meses atravessando o ano", () => {
    expect(addMonths("2026-11", -5)).toBe("2026-06");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});
