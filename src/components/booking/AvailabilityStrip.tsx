import { type Availability, unavailableReason } from "@/lib/booking";
import { addDays } from "@/lib/dates";
import { dateShort, weekdayShort } from "@/lib/format";

/** Próximos 14 dias do carro: livre ou indisponível (somente leitura). */
export function AvailabilityStrip({ availability }: { availability: Availability }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(availability.today, i));
  return (
    <ul className="days" aria-label="Disponibilidade nos próximos 14 dias">
      {days.map((d) => {
        const free = unavailableReason(d, availability) === null;
        return (
          <li
            key={d}
            className={`day ${free ? "" : "opacity-40 line-through"}`}
            aria-label={`${weekdayShort(d)} ${dateShort(d)}: ${free ? "livre" : "indisponível"}`}
          >
            <span aria-hidden>{weekdayShort(d)}</span>
            <b aria-hidden>{Number(d.slice(8))}</b>
          </li>
        );
      })}
    </ul>
  );
}
