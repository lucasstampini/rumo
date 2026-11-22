import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CirclePlus, Pencil, Star } from "lucide-react";
import { ActionButton } from "@/components/booking/ActionButton";
import { AvailabilityPanel } from "@/components/earn/AvailabilityPanel";
import { EarningsChart, type MonthPoint } from "@/components/earn/EarningsChart";
import { Simulator } from "@/components/earn/Simulator";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Pill";
import { acceptBooking, rejectBooking } from "@/lib/actions/bookings";
import { getBubble, getCarCalendar } from "@/lib/data";
import { addMonths, monthKey, todayISO } from "@/lib/dates";
import { brl, carName, dateRange, firstName, monthName, monthShort, rating } from "@/lib/format";
import { coveredPercent, monthlyCostCents } from "@/lib/pricing";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Ganhar" };

const MONTHS_IN_CHART = 6;

export default async function EarnPage({
  searchParams,
}: {
  searchParams: Promise<{ car?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfile();

  // Pedidos sem resposta há mais de 24h expiram (SPEC §6).
  await supabase.rpc("expire_stale_requests");

  const { data: cars, error } = await supabase
    .from("cars")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at");
  if (error) throw new Error("Não foi possível carregar os seus carros.");

  if (cars.length === 0) {
    return (
      <main className="page">
        <h1 className="h1">Ganhar</h1>
        <p className="sub">Seu carro fica parado 90% do tempo. Faça ele pagar as próprias contas.</p>
        <section className="earn">
          <img className="absolute -right-[30px] -top-5 w-[150px] opacity-[.12]" src="/logo.png" alt="" />
          <b className="font-display text-2xl font-black leading-tight">Anuncie seu carro</b>
          <small>
            Você escolhe os dias, o preço e quem aluga. A RUMO fica com 15% e cuida do pagamento e
            da proteção.
          </small>
          <Link href="/earn/cars/new" className="ghost self-start">
            <CirclePlus size={18} aria-hidden /> Anunciar meu carro
          </Link>
        </section>
        <Simulator />
      </main>
    );
  }

  const car = cars.find((c) => c.id === sp.car) ?? cars[0];
  const thisMonth = monthKey(new Date());
  const firstMonth = addMonths(thisMonth, -(MONTHS_IN_CHART - 1));

  const [bubble, calendar, { data: completed }, { data: open }, { data: history }] = await Promise.all([
    getBubble(supabase, profile.bubble_id ?? car.bubble_id),
    getCarCalendar(supabase, car.id),
    supabase
      .from("bookings")
      .select("owner_payout_cents, completed_at")
      .eq("car_id", car.id)
      .eq("status", "completed")
      .gte("completed_at", `${firstMonth}-01T00:00:00-03:00`),
    supabase
      .from("bookings")
      .select(
        "id, status, start_date, end_date, owner_payout_cents, renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url, verified)",
      )
      .eq("car_id", car.id)
      .in("status", ["requested", "accepted", "active"])
      .order("start_date"),
    supabase
      .from("bookings")
      .select(
        "id, status, start_date, end_date, owner_payout_cents, renter:profiles!bookings_renter_id_fkey(full_name)",
      )
      .eq("car_id", car.id)
      .in("status", ["completed", "rejected", "cancelled"])
      .order("start_date", { ascending: false })
      .limit(5),
  ]);

  const byMonth = new Map<string, number>();
  for (const b of completed ?? []) {
    if (!b.completed_at) continue;
    const key = monthKey(b.completed_at);
    byMonth.set(key, (byMonth.get(key) ?? 0) + b.owner_payout_cents);
  }
  const months: MonthPoint[] = Array.from({ length: MONTHS_IN_CHART }, (_, i) => {
    const key = addMonths(firstMonth, i);
    return { key, label: monthShort(key), cents: byMonth.get(key) ?? 0 };
  });
  const earned = byMonth.get(thisMonth) ?? 0;
  const cost = monthlyCostCents(car);
  const pct = coveredPercent(earned, cost);

  const requests = (open ?? []).filter((b) => b.status === "requested");
  const ongoing = (open ?? []).filter((b) => b.status !== "requested");
  const renterIds = [...new Set((open ?? []).map((b) => b.renter.id))];
  const { data: renterRatings } = renterIds.length
    ? await supabase.from("profile_ratings").select("profile_id, avg_rating").in("profile_id", renterIds)
    : { data: [] };
  const ratingOf = new Map((renterRatings ?? []).map((r) => [r.profile_id, r.avg_rating]));

  return (
    <main className="page">
      <h1 className="h1">Ganhar</h1>
      <p className="sub">
        {carName(car)} · placa {car.plate}
      </p>

      {sp.saved && (
        <p role="status" className="alert alert-ok">
          Anúncio salvo. {car.is_listed ? `Seu carro já aparece no mapa da bolha ${bubble.name}.` : ""}
        </p>
      )}

      {cars.length > 1 && (
        <nav aria-label="Seus carros" className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-0.5">
          {cars.map((c) => (
            <Link
              key={c.id}
              href={`/earn?car=${c.id}`}
              className="chip"
              aria-pressed={c.id === car.id}
              aria-current={c.id === car.id ? "page" : undefined}
            >
              {c.make} {c.model}
            </Link>
          ))}
        </nav>
      )}

      <section className="earn" aria-label="Ganhos do mês">
        <img className="absolute -right-[30px] -top-5 w-[150px] opacity-[.12]" src="/logo.png" alt="" />
        <small>Você ganhou em {monthName(thisMonth)}</small>
        <div className="big" data-testid="earned">
          {brl(earned)}
        </div>
        {cost > 0 ? (
          <>
            <div className="bar" role="img" aria-label={`${pct}% do custo mensal do carro coberto`}>
              <i style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[13px] font-semibold">
              <span>Custo do carro: {brl(cost)}/mês</span>
              <span data-testid="covered">{pct}% coberto</span>
            </div>
            <small>
              {pct >= 100
                ? `Seu carro se pagou e ainda sobrou ${brl(earned - cost)}.`
                : earned > 0
                  ? "Falta pouco para o carro se pagar este mês."
                  : "Aceite pedidos para o carro começar a se pagar."}
            </small>
          </>
        ) : (
          <small>Cadastre os custos anuais do carro para ver quanto do custo já foi coberto.</small>
        )}
      </section>

      <section className="panel" aria-label="Pedidos de reserva">
        <h2 className="panel-h">
          {requests.length > 0 ? `Novos pedidos de reserva (${requests.length})` : "Pedidos de reserva"}
        </h2>
        {requests.length === 0 ? (
          <p className="hint">
            Nenhum pedido pendente. Quando alguém pedir seu carro, o pedido aparece aqui para você
            aceitar ou recusar em até 24h.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {requests.map((b) => (
              <li key={b.id} className="flex flex-col gap-2.5" data-testid="request">
                <Link href={`/earn/bookings/${b.id}`} className="flex items-center gap-3 rounded-xl">
                  <Avatar name={b.renter.full_name} url={b.renter.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <b>{b.renter.full_name}</b>
                    <div className="meta">
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
                        {rating(ratingOf.get(b.renter.id))}
                      </span>
                      <span>{dateRange(b.start_date, b.end_date)}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
                <div className="rows">
                  <div>
                    <span>Você recebe (já com taxa RUMO de 15%)</span>
                    <b>{brl(b.owner_payout_cents)}</b>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1">
                    <ActionButton
                      action={rejectBooking.bind(null, b.id)}
                      className="ghost w-full"
                      pendingLabel="Recusando…"
                      confirm={`Recusar o pedido de ${firstName(b.renter.full_name)}? O pagamento será estornado.`}
                    >
                      Recusar
                    </ActionButton>
                  </div>
                  <div className="flex-1">
                    <ActionButton
                      action={acceptBooking.bind(null, b.id)}
                      className="cta w-full !py-3"
                      pendingLabel="Aceitando…"
                    >
                      Aceitar
                    </ActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ongoing.length > 0 && (
        <section className="panel" aria-label="Reservas em andamento">
          <h2 className="panel-h">Reservas em andamento</h2>
          <ul className="flex flex-col divide-y divide-line">
            {ongoing.map((b) => (
              <li key={b.id}>
                <Link href={`/earn/bookings/${b.id}`} className="flex items-center gap-3 py-2.5 rounded-xl">
                  <Avatar name={b.renter.full_name} url={b.renter.avatar_url} size={38} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{b.renter.full_name}</b>
                    <span className="meta">{dateRange(b.start_date, b.end_date)}</span>
                  </div>
                  <StatusPill status={b.status} />
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-label="Ganhos e custos">
        <h2 className="panel-h">Ganhos × custo mensal do carro</h2>
        <EarningsChart months={months} monthlyCostCents={cost} />
        <dl className="costs">
          <div>
            <dd className="font-bold text-ink text-[15px] tabular-nums">{brl(car.annual_ipva_cents)}</dd>
            <dt>IPVA/ano</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[15px] tabular-nums">{brl(car.annual_insurance_cents)}</dd>
            <dt>seguro/ano</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[15px] tabular-nums">{brl(car.annual_maintenance_cents)}</dd>
            <dt>manutenção/ano</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[15px] tabular-nums">{brl(car.annual_depreciation_cents)}</dd>
            <dt>depreciação/ano</dt>
          </div>
        </dl>
      </section>

      <AvailabilityPanel
        key={car.id}
        carId={car.id}
        bubbleName={bubble.name}
        listed={car.is_listed}
        weekdays={car.available_weekdays}
        blockedDays={calendar.blockedDays}
        busyRanges={calendar.busyRanges}
        today={todayISO()}
      />

      <Simulator key={`sim-${car.id}`} initialPriceCents={car.price_per_day_cents} />

      <section className="panel" aria-label="Histórico">
        <h2 className="panel-h">Histórico</h2>
        {history?.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((b) => (
              <li key={b.id}>
                <Link href={`/earn/bookings/${b.id}`} className="flex items-center gap-3 py-2.5 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{b.renter.full_name}</b>
                    <span className="meta">
                      {dateRange(b.start_date, b.end_date)}
                      {b.status === "completed" && <> · {brl(b.owner_payout_cents)}</>}
                    </span>
                  </div>
                  <StatusPill status={b.status} />
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Os aluguéis concluídos deste carro aparecem aqui.</p>
        )}
      </section>

      <div className="flex gap-2.5">
        <Link href={`/earn/cars/${car.id}/edit`} className="ghost flex-1 !bg-card">
          <Pencil size={16} aria-hidden /> Editar anúncio
        </Link>
        <Link href="/earn/cars/new" className="ghost flex-1 !bg-card">
          <CirclePlus size={16} aria-hidden /> Outro carro
        </Link>
      </div>
    </main>
  );
}
