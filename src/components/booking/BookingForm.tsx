"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { checkBookingDraft } from "@/lib/actions/bookings";
import { type DateRange, isRangeAvailable, unavailableReason } from "@/lib/booking";
import { addDays, type ISODate } from "@/lib/dates";
import { brl, dateShort, weekdayShort } from "@/lib/format";
import {
  countDays,
  FULL_PROTECTION_PER_DAY_CENTS,
  type ProtectionPlan,
  quote,
  rentalCompanyEstimateCents,
} from "@/lib/pricing";
import { StickyFooter } from "@/components/ui/PageHeader";

type Props = {
  carId: string;
  pricePerDayCents: number;
  today: ISODate;
  availableWeekdays: number[];
  blockedDays: ISODate[];
  busyRanges: DateRange[];
};

const CALENDAR_DAYS = 14; // "calendário de 2 semanas"

export function BookingForm({ carId, pricePerDayCents, today, availableWeekdays, blockedDays, busyRanges }: Props) {
  const router = useRouter();
  const availability = useMemo(
    () => ({ availableWeekdays, blockedDays, busyRanges, today }),
    [availableWeekdays, blockedDays, busyRanges, today],
  );
  const days = useMemo(() => Array.from({ length: CALENDAR_DAYS }, (_, i) => addDays(today, i)), [today]);
  const firstFree = days.find((d) => unavailableReason(d, availability) === null) ?? null;

  const [start, setStart] = useState<ISODate | null>(firstFree);
  const [end, setEnd] = useState<ISODate | null>(firstFree);
  const [picking, setPicking] = useState(false); // true = próximo toque escolhe a devolução
  const [protection, setProtection] = useState<ProtectionPlan>("basic");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickDay(d: ISODate) {
    setError(null);
    if (picking && start) {
      if (d >= start) setEnd(d);
      else {
        setEnd(start);
        setStart(d);
      }
      setPicking(false);
    } else {
      setStart(d);
      setEnd(d);
      setPicking(true);
    }
  }

  const hasDates = start !== null && end !== null;
  const rangeOk = hasDates && isRangeAvailable(start, end, availability);
  const q = hasDates ? quote({ pricePerDayCents, days: countDays(start, end), protection }) : null;

  async function confirm() {
    if (!hasDates || !rangeOk) return;
    setBusy(true);
    setError(null);
    const draft = { car_id: carId, start, end, protection, payment_method: method };
    const result = await checkBookingDraft(draft);
    if (result?.error) {
      setError(result.error);
      setBusy(false);
      router.refresh(); // recarrega o calendário com as datas que acabaram de ser ocupadas
      return;
    }
    const qs = new URLSearchParams({ car: carId, start, end, protection, method });
    router.push(`/bookings/new/pay?${qs}`);
  }

  return (
    <>
      <div className="page !pt-4">
        <section className="panel">
          <h2 className="panel-h">
            Quando · {dateShort(days[0])} a {dateShort(days[days.length - 1])}
          </h2>
          {firstFree === null ? (
            <p className="alert alert-warn">
              Este carro não tem dias livres nas próximas duas semanas. Tente outro carro da bolha.
            </p>
          ) : (
            <>
              <div className="days" role="group" aria-label="Escolha as datas">
                {days.map((d) => {
                  const reason = unavailableReason(d, availability);
                  const edge = d === start || d === end;
                  const inside = hasDates && d > start && d < end;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={reason !== null}
                      aria-pressed={edge || inside}
                      aria-label={`${weekdayShort(d)} ${dateShort(d)}${reason ? ", indisponível" : ""}`}
                      className={`day ${edge ? "edge" : inside ? "in" : ""}`}
                      onClick={() => pickDay(d)}
                    >
                      <span aria-hidden>{weekdayShort(d)}</span>
                      <b aria-hidden>{Number(d.slice(8))}</b>
                    </button>
                  );
                })}
              </div>
              <p className="hint" aria-live="polite">
                Toque no dia de retirada e depois no de devolução.{" "}
                {q && (
                  <>
                    {q.days} {q.days > 1 ? "diárias selecionadas" : "diária selecionada"}
                    {hasDates && ` (${dateShort(start)}${end !== start ? ` a ${dateShort(end)}` : ""})`}.
                  </>
                )}
              </p>
              {hasDates && !rangeOk && (
                <p role="alert" className="alert alert-warn">
                  O período escolhido inclui dias em que o carro não está disponível. Escolha dias
                  seguidos que estejam livres.
                </p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-h">Proteção</h2>
          <button type="button" className="opt" aria-pressed={protection === "basic"} onClick={() => setProtection("basic")}>
            <span className="r" />
            <span className="flex-1">
              <b>Básica</b>
              <small>Terceiros e assistência 24h · franquia R$ 3.000</small>
            </span>
            <b>Incluída</b>
          </button>
          <button type="button" className="opt" aria-pressed={protection === "full"} onClick={() => setProtection("full")}>
            <span className="r" />
            <span className="flex-1">
              <b>Completa</b>
              <small>Cobre o carro todo · franquia zero</small>
            </span>
            <b>+{brl(FULL_PROTECTION_PER_DAY_CENTS)}/dia</b>
          </button>
        </section>

        <section className="panel">
          <h2 className="panel-h">Pagamento</h2>
          <button type="button" className="opt" aria-pressed={method === "pix"} onClick={() => setMethod("pix")}>
            <span className="r" />
            <span className="flex-1">
              <b>Pix</b>
              <small>Aprovação na hora</small>
            </span>
          </button>
          <button type="button" className="opt" aria-pressed={method === "card"} onClick={() => setMethod("card")}>
            <span className="r" />
            <span className="flex-1">
              <b>Cartão de crédito</b>
              <small>Em até 3x sem juros</small>
            </span>
          </button>
        </section>

        {q && (
          <section className="panel">
            <h2 className="panel-h">Resumo</h2>
            <div className="rows">
              <div>
                <span>
                  {q.days} × {brl(pricePerDayCents)}
                </span>
                <span>{brl(q.subtotalCents)}</span>
              </div>
              {q.protectionCents > 0 && (
                <div>
                  <span>Proteção completa</span>
                  <span>{brl(q.protectionCents)}</span>
                </div>
              )}
              <div>
                <span>Taxa de serviço RUMO</span>
                <span>{brl(q.serviceFeeCents)}</span>
              </div>
              <div className="tot">
                <span>Total</span>
                <span data-testid="total">{brl(q.totalCents)}</span>
              </div>
            </div>
            <p className="hint">
              Numa locadora tradicional, o mesmo período sairia por cerca de{" "}
              {brl(rentalCompanyEstimateCents(q.totalCents))} (~45% mais caro), mais caução no cartão.
            </p>
          </section>
        )}

        {error && (
          <p role="alert" className="alert alert-error">
            {error}
          </p>
        )}
      </div>

      <StickyFooter>
        <button type="button" className="cta flex-1" disabled={!q || !rangeOk || busy} onClick={confirm}>
          {busy ? "Conferindo datas…" : q && rangeOk ? `Confirmar e pagar ${brl(q.totalCents)}` : "Escolha as datas"}
        </button>
      </StickyFooter>
    </>
  );
}
