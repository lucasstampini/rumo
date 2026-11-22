import { describe, expect, it } from "vitest";
import {
  type BookingStatus,
  canTransition,
  generatePickupCode,
  hasDateConflict,
  inspectionComplete,
  isRangeAvailable,
  rangesOverlap,
  refundsPayment,
  rentalTab,
  transitionRole,
  unavailableReason,
} from "@/lib/booking";

const ALL: BookingStatus[] = ["requested", "accepted", "active", "completed", "rejected", "cancelled"];

describe("transições de status", () => {
  it("permite o caminho feliz, cada passo pela pessoa certa", () => {
    expect(canTransition("requested", "accepted", "owner")).toBe(true);
    expect(canTransition("accepted", "active", "renter")).toBe(true);
    expect(canTransition("active", "completed", "owner")).toBe(true);
  });

  it("dono recusa pedido; locatário cancela antes de retirar", () => {
    expect(canTransition("requested", "rejected", "owner")).toBe(true);
    expect(canTransition("requested", "cancelled", "renter")).toBe(true);
    expect(canTransition("accepted", "cancelled", "renter")).toBe(true);
  });

  it("proíbe a pessoa errada", () => {
    expect(canTransition("requested", "accepted", "renter")).toBe(false);
    expect(canTransition("requested", "rejected", "renter")).toBe(false);
    expect(canTransition("accepted", "active", "owner")).toBe(false);
    expect(canTransition("active", "completed", "renter")).toBe(false);
    expect(canTransition("accepted", "cancelled", "owner")).toBe(false);
  });

  it("proíbe pular etapas e voltar atrás", () => {
    expect(transitionRole("requested", "active")).toBeNull();
    expect(transitionRole("requested", "completed")).toBeNull();
    expect(transitionRole("accepted", "completed")).toBeNull();
    expect(transitionRole("accepted", "rejected")).toBeNull();
    expect(transitionRole("active", "cancelled")).toBeNull();
    expect(transitionRole("active", "accepted")).toBeNull();
    expect(transitionRole("accepted", "requested")).toBeNull();
  });

  it("estados finais não saem do lugar", () => {
    for (const from of ["completed", "rejected", "cancelled"] as const) {
      for (const to of ALL) expect(transitionRole(from, to)).toBeNull();
    }
  });

  it("nenhum status transiciona para si mesmo", () => {
    for (const s of ALL) expect(transitionRole(s, s)).toBeNull();
  });

  it("recusa e cancelamento estornam o pagamento", () => {
    expect(refundsPayment("rejected")).toBe(true);
    expect(refundsPayment("cancelled")).toBe(true);
    expect(refundsPayment("accepted")).toBe(false);
    expect(refundsPayment("completed")).toBe(false);
  });
});

describe("sobreposição de datas", () => {
  it("períodos que se cruzam colidem", () => {
    expect(rangesOverlap("2026-11-27", "2026-11-29", "2026-11-28", "2026-11-30")).toBe(true);
    expect(rangesOverlap("2026-11-27", "2026-11-29", "2026-11-20", "2026-12-05")).toBe(true);
  });

  it("devolução e retirada no mesmo dia colidem (período é inclusivo)", () => {
    expect(rangesOverlap("2026-11-27", "2026-11-29", "2026-11-29", "2026-11-30")).toBe(true);
  });

  it("períodos vizinhos não colidem", () => {
    expect(rangesOverlap("2026-11-27", "2026-11-29", "2026-11-30", "2026-12-01")).toBe(false);
    expect(rangesOverlap("2026-11-27", "2026-11-29", "2026-11-25", "2026-11-26")).toBe(false);
  });

  it("só reservas requested/accepted/active ocupam as datas", () => {
    const range = { start_date: "2026-11-27", end_date: "2026-11-29" };
    for (const status of ["requested", "accepted", "active"] as const) {
      expect(hasDateConflict([{ ...range, status }], "2026-11-28", "2026-11-28")).toBe(true);
    }
    for (const status of ["completed", "rejected", "cancelled"] as const) {
      expect(hasDateConflict([{ ...range, status }], "2026-11-28", "2026-11-28")).toBe(false);
    }
  });

  it("sem reservas não há conflito", () => {
    expect(hasDateConflict([], "2026-11-27", "2026-11-29")).toBe(false);
  });
});

describe("disponibilidade", () => {
  const base = {
    availableWeekdays: [0, 5, 6], // dom, sex, sáb
    blockedDays: ["2026-12-05"],
    busyRanges: [{ start_date: "2026-11-27", end_date: "2026-11-29" }],
    today: "2026-11-22",
  };

  it("explica por que o dia não está livre", () => {
    expect(unavailableReason("2026-11-21", base)).toBe("past");
    expect(unavailableReason("2026-11-25", base)).toBe("weekday"); // quarta
    expect(unavailableReason("2026-12-05", base)).toBe("blocked"); // sábado bloqueado
    expect(unavailableReason("2026-11-28", base)).toBe("busy");
    expect(unavailableReason("2026-12-04", base)).toBeNull(); // sexta livre
  });

  it("hoje pode ser reservado", () => {
    expect(unavailableReason("2026-11-22", base)).toBeNull(); // domingo
  });

  it("o período só vale se todos os dias estiverem livres", () => {
    expect(isRangeAvailable("2026-12-11", "2026-12-13", base)).toBe(true); // sex → dom
    expect(isRangeAvailable("2026-12-04", "2026-12-06", base)).toBe(false); // inclui o bloqueado
    expect(isRangeAvailable("2026-12-10", "2026-12-12", base)).toBe(false); // quinta não é dia liberado
    expect(isRangeAvailable("2026-11-29", "2026-12-04", base)).toBe(false); // esbarra em reserva
    expect(isRangeAvailable("2026-12-13", "2026-12-11", base)).toBe(false); // invertido
  });
});

describe("código de retirada", () => {
  it("tem sempre 4 dígitos", () => {
    for (let i = 0; i < 200; i++) expect(generatePickupCode()).toMatch(/^\d{4}$/);
  });

  it("preenche com zeros à esquerda e nunca passa de 9999", () => {
    expect(generatePickupCode(() => 0)).toBe("0000");
    expect(generatePickupCode(() => 0.0042)).toBe("0042");
    expect(generatePickupCode(() => 0.99999)).toBe("9999");
  });
});

describe("vistoria e abas", () => {
  it("vistoria completa exige os 4 ângulos", () => {
    expect(inspectionComplete(["front", "back", "left", "right"])).toBe(true);
    expect(inspectionComplete(["front", "back", "left"])).toBe(false);
    expect(inspectionComplete(["front", "front", "back", "left"])).toBe(false);
  });

  it("cada status cai na aba certa de Aluguéis", () => {
    expect(rentalTab("requested")).toBe("upcoming");
    expect(rentalTab("accepted")).toBe("upcoming");
    expect(rentalTab("active")).toBe("active");
    expect(rentalTab("completed")).toBe("past");
    expect(rentalTab("rejected")).toBe("past");
    expect(rentalTab("cancelled")).toBe("past");
  });
});
