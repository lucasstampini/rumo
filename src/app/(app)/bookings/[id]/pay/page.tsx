import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PixPayment } from "@/components/booking/PixPayment";
import { PageHeader } from "@/components/ui/PageHeader";
import { validateDraft } from "@/lib/booking-server";
import { brl, carName, dateRange, firstName, plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Pagamento" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * /bookings/new/pay?car=…&start=…&end=…  → pagamento simulado (a reserva ainda não existe;
 *                                           ela é criada já paga ao "Simular pagamento").
 * /bookings/<id>/pay                      → tela de sucesso da reserva criada.
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();

  if (id === "new") {
    const sp = await searchParams;
    const carId = one(sp.car);
    const result = await validateDraft(supabase, user.id, {
      car_id: carId,
      start: one(sp.start),
      end: one(sp.end),
      protection: one(sp.protection),
      payment_method: one(sp.method),
    });
    const backHref = carId ? `/cars/${carId}/book` : "/explore";

    if (!result.ok) {
      return (
        <>
          <PageHeader title="Pagamento" backHref={backHref} />
          <main className="page !pt-4">
            <div className="panel empty">
              <b className="text-ink text-base">Não deu para seguir com esta reserva</b>
              <p role="alert" className="alert alert-error w-full">
                {result.error}
              </p>
              <Link href={backHref} className="cta !py-3 !px-5">
                Escolher outras datas
              </Link>
            </div>
          </main>
        </>
      );
    }

    const { draft, car, quote } = result;
    return (
      <>
        <PageHeader title="Pagamento" backHref={backHref} />
        <main>
          <div className="px-4 pt-4">
            <div className="panel">
              <b>{carName(car)}</b>
              <div className="rows">
                <div>
                  <span>
                    {dateRange(draft.start, draft.end)} · {plural(quote.days, "diária", "diárias")}
                  </span>
                  <b>{brl(quote.totalCents)}</b>
                </div>
              </div>
            </div>
          </div>
          <PixPayment draft={draft} totalCents={quote.totalCents} />
        </main>
      </>
    );
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, renter_id, start_date, end_date, total_cents, payment_method, car:cars!inner(make, model, year, owner:profiles!cars_owner_id_fkey(full_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!booking || booking.renter_id !== user.id) notFound();

  const owner = firstName(booking.car.owner.full_name);
  return (
    <main className="page min-h-[calc(100dvh-var(--nav-h))] items-center justify-center text-center !px-6">
      <div className="size-[92px] rounded-full bg-green grid place-items-center animate-pop">
        <Check size={46} color="#fff" strokeWidth={3} aria-hidden />
      </div>
      <h1 className="title">Pagamento confirmado!</h1>
      <p className="text-[15px] text-muted max-w-[32ch]">
        {carName(booking.car)} de {owner}, {dateRange(booking.start_date, booking.end_date)}. Total{" "}
        {brl(booking.total_cents)} ({booking.payment_method === "pix" ? "Pix" : "cartão"}).
      </p>
      <p className="hint max-w-[36ch]">
        Enviamos o pedido para {owner}. Assim que for aceito, seu código de retirada e o endereço
        aparecem na aba Aluguéis.
      </p>
      <Link href={`/rentals/${booking.id}`} className="cta w-full mt-2.5">
        Ver meu aluguel
      </Link>
    </main>
  );
}
