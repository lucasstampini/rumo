"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { brl } from "@/lib/format";

export type MonthPoint = { key: string; label: string; cents: number };

const compact = (cents: number) =>
  cents >= 100_000
    ? `${(cents / 100_000).toFixed(1).replace(".", ",")}k`
    : String(Math.round(cents / 100));

/** Ganhos dos últimos 6 meses × linha do custo mensal do carro. */
export function EarningsChart({
  months,
  monthlyCostCents,
}: {
  months: MonthPoint[];
  monthlyCostCents: number;
}) {
  const max =
    Math.max(monthlyCostCents, ...months.map((m) => m.cents), 10_000) * 1.18;
  return (
    <>
      <div className="h-[170px]" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={months}
            margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
            barCategoryGap="22%"
          >
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#5f7368", fontFamily: "inherit" }}
            />
            <YAxis hide domain={[0, max]} />
            <Bar
              dataKey="cents"
              radius={[6, 6, 6, 6]}
              isAnimationActive={false}
            >
              {months.map((m, i) => (
                <Cell
                  key={m.key}
                  fill={i === months.length - 1 ? "#159a58" : "#9fd6b7"}
                />
              ))}
              <LabelList
                dataKey="cents"
                position="top"
                formatter={(v) => compact(Number(v))}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fill: "#10231a",
                  fontFamily: "inherit",
                }}
              />
            </Bar>
            {monthlyCostCents > 0 && (
              <ReferenceLine
                y={monthlyCostCents}
                stroke="#d64545"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3.5 text-xs text-muted flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-green inline-block" />
          Ganhos no RUMO
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-red inline-block" />
          Custo do carro ({brl(monthlyCostCents)})
        </span>
      </div>
      {/* Tabela só para leitor de tela. O sr-only vai num <div>: direto no <table> alguns navegadores
          ignoram o recorte e o texto aparece por cima do gráfico. */}
      <div className="sr-only">
        <table>
          <caption>Ganhos por mês e custo mensal do carro</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Ganhos</th>
              <th>Custo do carro</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <td>{m.label}</td>
                <td>{brl(m.cents)}</td>
                <td>{brl(monthlyCostCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
