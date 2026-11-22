import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Hourglass, MapPin } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ActionButton } from "@/components/booking/ActionButton";
import { InspectionGallery, InspectionUploader } from "@/components/booking/Inspection";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/Pill";
import { Stars } from "@/components/ui/Stars";
import { cancelBooking, startRental } from "@/lib/actions/bookings";
import { inspectionComplete } from "@/lib/booking";
import { firstPhoto, getInspectionPhotos } from "@/lib/data";
import { brl, carName, dateRange, dateTime, dateWithWeekday, firstName, plural } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Aluguel" };

export default async function RentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  await supabase.rpc("expire_stale_requests");

  const { data: b } = await supabase
    .from("bookings")
    .select(
      "*, car:cars!inner(id, make, model, year, pickup_address, car_photos(url, position), owner:profiles!cars_owner_id_fkey(id, full_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!b || b.renter_id !== user.id) notFound();

  const [photos, { data: reviews }] = await Promise.all([
    getInspectionPhotos(supabase, b.id),
    supabase.from("reviews").select("author_id, rating, comment").eq("booking_id", b.id),
  ]);
  const owner = firstName(b.car.owner.full_name);
  const photo = firstPhoto(b.car.car_photos);
  const pickupDone = inspectionComplete(Object.keys(photos.pickup));
  const returnDone = inspectionComplete(Object.keys(photos.return));
  const myReview = reviews?.find((r) => r.author_id === user.id);
  const theirReview = reviews?.find((r) => r.author_id === b.car.owner.id);
  const waiting = b.status === "requested" || b.status === "accepted" || b.status === "active";

  return (
    <>
      {waiting && <AutoRefresh />}
      <PageHeader title="Aluguel" backHref="/rentals" />
      <main className="page !pt-4">
        <section className="panel">
          <div className="flex items-center gap-3">
            <div className="thumb">{photo && <img src={photo} alt="" />}</div>
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <b className="truncate">{carName(b.car)}</b>
              <span className="meta">{dateRange(b.start_date, b.end_date)}</span>
              <span>
                <StatusPill status={b.status} />
              </span>
            </div>
          </div>
          <p className="meta">
            <MapPin size={14} aria-hidden /> {b.car.pickup_address} · com {owner}
          </p>
        </section>

        {b.status === "requested" && (
          <section className="panel items-center text-center">
            <Hourglass size={36} className="text-amber" aria-hidden />
            <b className="text-base">Aguardando {owner} aceitar</b>
            <p className="hint">
              Seu pagamento está confirmado. {owner} tem até 24h para responder; se recusar ou não
              responder, o valor volta para você. O código de retirada aparece aqui assim que o pedido
              for aceito.
            </p>
          </section>
        )}

        {b.status === "accepted" && (
          <>
            <section className="key" aria-label="Código de retirada">
              <span className="text-xs tracking-[.1em] uppercase opacity-80">Código de retirada</span>
              <div className="code" data-testid="pickup-code">
                {b.pickup_code}
              </div>
              <span className="text-[12.5px] opacity-85">
                Mostre na entrega das chaves com {owner} · {dateWithWeekday(b.start_date)}
              </span>
              {b.pickup_confirmed_at ? (
                <span className="badge">
                  <CircleCheck size={13} aria-hidden /> Código confirmado por {owner}
                </span>
              ) : (
                <span className="text-[12.5px] font-bold text-amber">Aguardando {owner} conferir o código</span>
              )}
            </section>

            <section className="panel">
              <h2 className="panel-h">Vistoria de retirada</h2>
              <p className="hint">
                Fotografe o carro antes de sair. As fotos protegem você e o dono em caso de dano.
              </p>
              <InspectionUploader bookingId={b.id} kind="pickup" photos={photos.pickup} />
              <ActionButton
                action={startRental.bind(null, b.id)}
                pendingLabel="Iniciando…"
                disabled={!pickupDone || !b.pickup_confirmed_at}
              >
                Iniciar aluguel
              </ActionButton>
              {(!pickupDone || !b.pickup_confirmed_at) && (
                <p className="hint text-center">
                  {!pickupDone
                    ? "Envie as 4 fotos para liberar o início."
                    : `Falta ${owner} confirmar o código de retirada.`}
                </p>
              )}
            </section>
          </>
        )}

        {b.status === "active" && (
          <>
            <p className="alert alert-ok">
              Aluguel em andamento{b.started_at ? ` desde ${dateTime(b.started_at)}` : ""}. Devolução
              até {dateWithWeekday(b.end_date)}, no mesmo lugar. Boa viagem!
            </p>
            <section className="panel">
              <h2 className="panel-h">Devolver carro</h2>
              <p className="hint">
                Ao devolver, estacione no endereço de retirada e fotografe o carro de novo. Depois
                {" "}
                {owner} confirma a devolução.
              </p>
              <InspectionUploader bookingId={b.id} kind="return" photos={photos.return} />
              {returnDone && (
                <p className="alert alert-warn">
                  Fotos enviadas. Aguardando {owner} confirmar a devolução para concluir o aluguel.
                </p>
              )}
            </section>
          </>
        )}

        {b.status === "completed" && (
          <>
            <p className="alert alert-ok">
              Aluguel concluído{b.completed_at ? ` em ${dateTime(b.completed_at)}` : ""}. Obrigado por
              usar o RUMO!
            </p>
            <section className="panel">
              <h2 className="panel-h">Avaliações</h2>
              {myReview ? (
                <div>
                  <b className="text-sm">Sua avaliação de {owner}</b>
                  <div className="mt-1">
                    <Stars value={myReview.rating} />
                  </div>
                  {myReview.comment && <p className="text-sm text-muted mt-1">{myReview.comment}</p>}
                </div>
              ) : (
                <ReviewForm bookingId={b.id} targetName={owner} />
              )}
              {theirReview && (
                <div className="border-t border-line pt-3">
                  <b className="text-sm">{owner} avaliou você</b>
                  <div className="mt-1">
                    <Stars value={theirReview.rating} />
                  </div>
                  {theirReview.comment && <p className="text-sm text-muted mt-1">{theirReview.comment}</p>}
                </div>
              )}
            </section>
          </>
        )}

        {(b.status === "rejected" || b.status === "cancelled") && (
          <p className="alert alert-warn">
            {b.status === "rejected"
              ? `${owner} não aceitou este pedido (ou ele expirou após 24h).`
              : "Você cancelou esta reserva."}{" "}
            O valor de {brl(b.total_cents)} foi estornado (simulado).
          </p>
        )}

        {(b.status === "active" || b.status === "completed") && (
          <section className="panel">
            <h2 className="panel-h">Vistoria</h2>
            <InspectionGallery title="Retirada" photos={photos.pickup} />
            {b.status === "completed" && <InspectionGallery title="Devolução" photos={photos.return} />}
          </section>
        )}

        <section className="panel">
          <h2 className="panel-h">Pagamento</h2>
          <div className="rows">
            <div>
              <span>{plural(b.days, "diária", "diárias")}</span>
              <span>{brl(b.subtotal_cents)}</span>
            </div>
            {b.protection_cents > 0 && (
              <div>
                <span>Proteção completa</span>
                <span>{brl(b.protection_cents)}</span>
              </div>
            )}
            <div>
              <span>Taxa de serviço RUMO</span>
              <span>{brl(b.service_fee_cents)}</span>
            </div>
            <div className="tot">
              <span>
                {b.payment_status === "refunded" ? "Estornado" : "Total pago"} (
                {b.payment_method === "pix" ? "Pix" : "cartão"})
              </span>
              <span>{brl(b.total_cents)}</span>
            </div>
          </div>
        </section>

        {(b.status === "requested" || b.status === "accepted") && (
          <ActionButton
            action={cancelBooking.bind(null, b.id)}
            className="ghost w-full !bg-card danger"
            pendingLabel="Cancelando…"
            confirm="Cancelar esta reserva? O valor pago será estornado."
          >
            Cancelar reserva
          </ActionButton>
        )}

        {b.status !== "requested" && b.status !== "accepted" && b.status !== "active" && (
          <Link href={`/cars/${b.car.id}`} className="ghost w-full !bg-card">
            Ver o carro de novo
          </Link>
        )}
      </main>
    </>
  );
}
