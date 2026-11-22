"use client";

import { useState } from "react";
import { brl } from "@/lib/format";
import { simulateMonthlyIncomeCents } from "@/lib/pricing";

/** Simulador de renda: dias × diária × 0,85. */
export function Simulator({ initialPriceCents = 12000 }: { initialPriceCents?: number }) {
  const [days, setDays] = useState(12);
  const [price, setPrice] = useState(
    Math.min(250, Math.max(60, Math.round(initialPriceCents / 500) * 5)),
  );

  return (
    <section className="panel">
      <h2 className="panel-h">Simulador de renda</h2>
      <label className="hint" htmlFor="sim-days">
        Dias alugados por mês: <b className="text-ink">{days}</b>
      </label>
      <input
        id="sim-days"
        type="range"
        min={1}
        max={30}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="w-full accent-green"
      />
      <label className="hint" htmlFor="sim-price">
        Diária: <b className="text-ink">{brl(price * 100)}</b>
      </label>
      <input
        id="sim-price"
        type="range"
        min={60}
        max={250}
        step={5}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        className="w-full accent-green"
      />
      <div className="flex justify-between items-end gap-3">
        <span className="hint">
          Renda líquida estimada
          <br />
          por mês, já sem a taxa RUMO
        </span>
        <output
          htmlFor="sim-days sim-price"
          data-testid="sim-out"
          className="font-display text-[30px] font-black text-green-d tabular-nums whitespace-nowrap"
        >
          {brl(simulateMonthlyIncomeCents(days, price * 100))}
        </output>
      </div>
    </section>
  );
}
