import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, ShieldCheck, Star } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ActionButton } from "@/components/booking/ActionButton";
import { InspectionGallery } from "@/components/booking/Inspection";
import { PickupCodeForm } from "@/components/booking/PickupCodeForm";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/Pill";
import { Stars } from "@/components/ui/Stars";
import { acceptBooking, confirmReturn, rejectBooking } from "@/lib/actions/bookings";
import { inspectionComplete } from "@/lib/booking";
import { getInspectionPhotos } from "@/lib/data";
import { brl, carName, dateRange, dateTime, firstName, plural, rating } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Reserva" };

export default async function OwnerBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  await supabase.rpc("expire_stale_requests");

  const { data: b } = await supabase
    .from("bookings")
    .select(
      "*, car:cars!inner(id, owner_id, make, model, year, pickup_address), renter:profiles!bookings_renter_id_fkey(id, full_name, avatar_url, verified)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!b || b.car.owner_id !== user.id) notFound();

  const [photos, { data: renterStats }, { data: reviews }] = await Promise.all([
    getInspectionPhotos(supabase, b.id),
    supabase
      .from("profile_ratings")
      .select("avg_rating, review_count")
      .eq("profile_id", b.renter.id)
      .maybeSingle(),
    supabase.from("reviews").select("author_id, rating, comment").eq("booking_id", b.id),
  ]);
  const renter = firstName(b.renter.full_name);
  const myReview = reviews?.find((r) => r.author_id === user.id);
  const theirReview = reviews?.find((r) => r.author_id === b.renter.id);
  const pickupDone = inspectionComplete(Object.keys(photos.pickup));
  const returnDone = inspectionComplete(Object.keys(photos.return));

  return (
    <>
      {(b.status === "accepted" || b.status === "active") && <AutoRefresh />}
      <PageHeader title="Reserva" backHref={`/earn?car=${b.car.id}`} />
      <main className="page !pt-4">
        <section className="panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="panel-h">{carName(b.car)}</h2>
            <StatusPill status={b.status} label={b.status === "requested" ? "Novo pedido" : undefined} />
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={b.renter.full_name} url={b.renter.avatar_url} />
            <div className="min-w-0">
              <b>{b.renter.full_name}</b>
              <div className="meta mt-0.5">
                {b.renter.verified && (
                  <span className="badge">
                    <ShieldCheck size={12} aria-hidden /> CNH verificada
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
                  {renterStats?.review_count
                    ? `${rating(renterStats.avg_rating)} · ${plural(renterStats.review_count, "avaliação", "avaliações")}`
                    : "Primeiro aluguel"}
                </span>
              </div>
            </div>
          </div>
          <div className="rows">
            <div>
              <span>Período</span>
              <b>{dateRange(b.start_date, b.end_date)}</b>
            </div>
            <div>
              <span>
                {plural(b.days, "diária", "diárias")} · proteção {b.protection === "full" ? "completa" : "básica"}
              </span>
              <span>{brl(b.subtotal_cents)}</span>
            </div>
            <div className="tot">
              <span>Você recebe (já com taxa RUMO de 15%)</span>
              <span data-testid="payout">{brl(b.owner_payout_cents)}</span>
            </div>
          </div>
        </section>

        {b.status === "requested" && (
          <section className="panel">
            <h2 className="panel-h">Responder ao pedido</h2>
            <p className="hint">
              {renter} já pagou. Se você aceitar, geramos o código de retirada. Sem resposta em 24h o
              pedido expira e o valor é devolvido.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex-1">
                <ActionButton
                  action={rejectBooking.bind(null, b.id)}
                  className="ghost w-full"
                  pendingLabel="Recusando…"
                  confirm={`Recusar o pedido de ${renter}? O pagamento será estornado.`}
                >
                  Recusar
                </ActionButton>
              </div>
              <div className="flex-1">
                <ActionButton action={acceptBooking.bind(null, b.id)} className="cta w-full !py-3" pendingLabel="Aceitando…">
                  Aceitar
                </ActionButton>
              </div>
            </div>
          </section>
        )}

        {b.status === "accepted" && (
          <section className="panel">
            <h2 className="panel-h">Entrega das chaves</h2>
            {b.pickup_confirmed_at ? (
              <>
                <p className="alert alert-ok flex items-center gap-2">
                  <CircleCheck size={18} aria-hidden /> Código confirmado em {dateTime(b.pickup_confirmed_at)}.
                </p>
                <p className="hint">
                  {pickupDone
                    ? `${renter} já fez a vistoria e pode iniciar o aluguel.`
                    : `Falta ${renter} enviar as 4 fotos da vistoria para iniciar o aluguel.`}
                </p>
              </>
            ) : (
              <>
                <p className="hint">
                  Retirada em {b.car.pickup_address}, a partir de {dateRange(b.start_date, b.start_date)}.
                </p>
                <PickupCodeForm bookingId={b.id} renterName={renter} />
              </>
            )}
          </section>
        )}

        {b.status === "active" && (
          <section className="panel">
            <h2 className="panel-h">Aluguel em andamento</h2>
            <p className="hint">
              {b.started_at && <>Iniciado em {dateTime(b.started_at)}. </>}
              Devolução prevista para {dateRange(b.end_date, b.end_date)}, em {b.car.pickup_address}.
            </p>
            {returnDone ? (
              <>
                <p className="alert alert-ok">
                  {renter} enviou as 4 fotos de devolução. Confira o carro e confirme.
                </p>
                <ActionButton action={confirmReturn.bind(null, b.id)} pendingLabel="Confirmando…">
                  Confirmar devolução
                </ActionButton>
              </>
            ) : (
              <p className="alert alert-warn">
                Aguardando {renter} devolver o carro e enviar as 4 fotos de devolução. O botão para
                confirmar aparece aqui em seguida.
              </p>
            )}
          </section>
        )}

        {(b.status === "rejected" || b.status === "cancelled") && (
          <p className="alert alert-warn">
            {b.status === "rejected"
              ? "Pedido recusado (ou expirado após 24h sem resposta)."
              : `${renter} cancelou esta reserva.`}{" "}
            O pagamento foi estornado ao locatário; nada é repassado.
          </p>
        )}

        {(pickupDone || returnDone || Object.keys(photos.pickup).length > 0) && (
          <section className="panel">
            <h2 className="panel-h">Vistoria</h2>
            <InspectionGallery title="Retirada" photos={photos.pickup} />
            <InspectionGallery title="Devolução" photos={photos.return} />
            <p className="hint">As fotos protegem você e o locatário em caso de dano.</p>
          </section>
        )}

        {b.status === "completed" && (
          <>
            <p className="alert alert-ok">
              Aluguel concluído{b.completed_at ? ` em ${dateTime(b.completed_at)}` : ""}. Repasse de{" "}
              {brl(b.owner_payout_cents)} somado aos seus ganhos do mês.
            </p>
            <section className="panel">
              <h2 className="panel-h">Avaliações</h2>
              {myReview ? (
                <div>
                  <b className="text-sm">Sua avaliação de {renter}</b>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={myReview.rating} />
                  </div>
                  {myReview.comment && <p className="text-sm text-muted mt-1">{myReview.comment}</p>}
                </div>
              ) : (
                <ReviewForm bookingId={b.id} targetName={renter} />
              )}
              {theirReview && (
                <div className="border-t border-line pt-3">
                  <b className="text-sm">{renter} avaliou você</b>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={theirReview.rating} />
                  </div>
                  {theirReview.comment && <p className="text-sm text-muted mt-1">{theirReview.comment}</p>}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
