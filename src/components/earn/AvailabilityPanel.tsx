"use client";

import { useState, useTransition } from "react";
import { setCarListed, setCarWeekdays, toggleBlockedDate } from "@/lib/actions/cars";
import type { DateRange } from "@/lib/booking";
import { hasDateConflict } from "@/lib/booking";
import { addDays, type ISODate, weekday } from "@/lib/dates";
import { dateShort, WEEKDAY_LETTERS, WEEKDAY_NAMES, weekdayShort } from "@/lib/format";

// segunda → domingo, como no protótipo
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  carId: string;
  bubbleName: string;
  listed: boolean;
  weekdays: number[];
  blockedDays: ISODate[];
  busyRanges: DateRange[];
  today: ISODate;
};

/** Toggle "visível", dias da semana e bloqueio de dias específicos. Atualização otimista. */
export function AvailabilityPanel(props: Props) {
  const [listed, setListed] = useState(props.listed);
  const [days, setDays] = useState(props.weekdays);
  const [blocked, setBlocked] = useState(props.blockedDays);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | null>, rollback: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        rollback();
        setError(result.error);
      }
    });
  }

  function toggleListed() {
    const next = !listed;
    setListed(next);
    run(
      () => setCarListed(props.carId, next),
      () => setListed(!next),
    );
  }

  function toggleDay(d: number) {
    const prev = days;
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    if (next.length === 0) {
      setError("Deixe pelo menos um dia disponível, ou pause o carro no botão acima.");
      return;
    }
    setDays(next);
    run(
      () => setCarWeekdays(props.carId, next),
      () => setDays(prev),
    );
  }

  function toggleBlocked(day: ISODate) {
    const prev = blocked;
    const isBlocked = blocked.includes(day);
    setBlocked(isBlocked ? blocked.filter((x) => x !== day) : [...blocked, day]);
    run(
      () => toggleBlockedDate(props.carId, day, !isBlocked),
      () => setBlocked(prev),
    );
  }

  const next14 = Array.from({ length: 14 }, (_, i) => addDays(props.today, i));

  return (
    <section className="panel">
      <h2 className="panel-h">Disponibilidade</h2>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <b id="listed-label">Carro visível no app</b>
          <div className="meta">
            {listed ? `Aparece para quem está na bolha ${props.bubbleName}` : "Pausado, ninguém pode reservar"}
          </div>
        </div>
        <button
          type="button"
          className="toggle"
          aria-pressed={listed}
          aria-labelledby="listed-label"
          onClick={toggleListed}
        />
      </div>

      <div className="wk" role="group" aria-label="Dias da semana disponíveis">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days.includes(d)}
            aria-label={WEEKDAY_NAMES[d]}
            onClick={() => toggleDay(d)}
          >
            {WEEKDAY_LETTERS[d]}
          </button>
        ))}
      </div>
      <p className="hint">Dias em que você não usa o carro. Ele só aparece para aluguel nesses dias.</p>

      <h3 className="panel-h mt-1">Bloquear dias específicos</h3>
      <div className="days" role="group" aria-label="Bloquear dias nos próximos 14 dias">
        {next14.map((day) => {
          const reserved = hasDateConflict(props.busyRanges, day, day);
          const off = !days.includes(weekday(day));
          const isBlocked = blocked.includes(day);
          return (
            <button
              key={day}
              type="button"
              disabled={reserved || off}
              aria-pressed={isBlocked}
              aria-label={`${weekdayShort(day)} ${dateShort(day)}: ${
                reserved ? "reservado" : off ? "dia da semana desligado" : isBlocked ? "bloqueado" : "livre"
              }`}
              className={`day ${reserved ? "in !opacity-100 !no-underline" : ""} ${isBlocked ? "!bg-ink !text-white [&_b]:!text-white" : ""}`}
              onClick={() => toggleBlocked(day)}
            >
              <span aria-hidden>{weekdayShort(day)}</span>
              <b aria-hidden>{Number(day.slice(8))}</b>
            </button>
          );
        })}
      </div>
      <p className="hint">
        Toque em um dia para bloquear (escuro). Dias em verde já têm reserva; riscados estão desligados.
      </p>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
    </section>
  );
}
