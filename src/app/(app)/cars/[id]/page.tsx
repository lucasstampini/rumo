import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Star } from "lucide-react";
import { AvailabilityStrip } from "@/components/booking/AvailabilityStrip";
import { WalkMinutes } from "@/components/car/WalkMinutes";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, StickyFooter } from "@/components/ui/PageHeader";
import { Stars } from "@/components/ui/Stars";
import { getBubble, getCarCalendar } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { brl, carName, firstName, plural, rating } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Detalhes do carro" };

const CATEGORY_LABEL = { economy: "Econômico", sedan: "Sedan", suv: "SUV" } as const;

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();

  const { data: car } = await supabase
    .from("cars")
    .select(
      "*, car_photos(url, position), owner:profiles!cars_owner_id_fkey(id, full_name, avatar_url, verified)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!car) notFound();

  const [bubble, calendar, { data: stats }, { data: reviews }, { data: ownerStats }] =
    await Promise.all([
      getBubble(supabase, car.bubble_id),
      getCarCalendar(supabase, car.id),
      supabase
        .from("car_ratings")
        .select("avg_rating, review_count, trips_count")
        .eq("car_id", car.id)
        .maybeSingle(),
      supabase
        .from("car_reviews")
        .select("id, rating, comment, created_at, author_name, author_avatar_url")
        .eq("car_id", car.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("profile_ratings")
        .select("avg_rating, review_count")
        .eq("profile_id", car.owner_id)
        .maybeSingle(),
    ]);

  const photos = [...car.car_photos].sort((a, b) => a.position - b.position);
  const name = carName(car);
  const isOwner = car.owner_id === user.id;
  const sameBubble = !profile.bubble_id || profile.bubble_id === car.bubble_id;

  return (
    <>
      <PageHeader title="Detalhes do carro" backHref={isOwner ? "/earn" : "/explore"} />
      <main className="page !pt-4">
        <section aria-label="Fotos do carro" className="relative">
          <ul className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-3xl">
            {photos.length === 0 ? (
              <li className="shrink-0 basis-full h-[190px] bg-green-l grid place-items-center text-muted rounded-3xl">
                Sem fotos ainda
              </li>
            ) : (
              photos.map((p, i) => (
                <li
                  key={p.url}
                  className="snap-center shrink-0 basis-full h-[190px] bg-green-l rounded-3xl overflow-hidden"
                >
                  <img
                    src={p.url}
                    alt={`${name}, foto ${i + 1} de ${photos.length}`}
                    className="w-full h-full object-cover"
                  />
                </li>
              ))
            )}
          </ul>
          <span className="absolute top-3 left-3 bg-card text-xs font-bold px-2.5 py-[5px] rounded-full text-green-d">
            {CATEGORY_LABEL[car.category]}
          </span>
          {photos.length > 1 && (
            <span className="absolute bottom-3 right-3 bg-ink/75 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {photos.length} fotos · deslize
            </span>
          )}
        </section>

        <div>
          <h2 className="title">{name}</h2>
          <div className="meta mt-1.5">
            {sameBubble && <WalkMinutes bubble={bubble} lat={car.lat} lng={car.lng} long />}
            <span className="inline-flex items-center gap-1">
              <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
              {stats?.review_count
                ? `${rating(stats.avg_rating)} · ${plural(stats.trips_count ?? 0, "aluguel", "aluguéis")}`
                : "Novo no RUMO"}
            </span>
          </div>
        </div>

        <dl className="specs">
          <div>
            <dd className="font-bold text-ink text-[13px]">{car.seats}</dd>
            <dt>lugares</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[13px]">
              {car.transmission === "automatic" ? "Auto" : "Manual"}
            </dd>
            <dt>câmbio</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[13px]">Flex</dd>
            <dt>combust.</dt>
          </div>
          <div>
            <dd className="font-bold text-ink text-[13px]">Sim</dd>
            <dt>ar-cond.</dt>
          </div>
        </dl>

        {car.description && (
          <section className="panel">
            <h3 className="panel-h">Sobre o carro</h3>
            <p className="text-sm leading-relaxed">{car.description}</p>
            <p className="hint">
              {car.color} · retirada em {car.pickup_address}
            </p>
          </section>
        )}

        <section className="panel">
          <h3 className="panel-h">Proprietário</h3>
          <div className="flex items-center gap-3">
            <Avatar name={car.owner.full_name} url={car.owner.avatar_url} />
            <div className="min-w-0">
              <b>{car.owner.full_name}</b>
              <div className="meta mt-0.5">
                {car.owner.verified && (
                  <span className="badge">
                    <ShieldCheck size={12} aria-hidden /> Verificado
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
                  {ownerStats?.review_count
                    ? `${rating(ownerStats.avg_rating)} · ${plural(ownerStats.review_count, "avaliação", "avaliações")}`
                    : "Sem avaliações ainda"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-h">Disponibilidade · próximos 14 dias</h3>
          <AvailabilityStrip
            availability={{
              availableWeekdays: car.available_weekdays,
              blockedDays: calendar.blockedDays,
              busyRanges: calendar.busyRanges,
              today: todayISO(),
            }}
          />
          <p className="hint">Dias riscados já estão reservados ou o dono usa o carro.</p>
        </section>

        <section className="panel">
          <h3 className="panel-h">Como funciona</h3>
          <p className="hint">
            Combine a retirada pelo app, pegue as chaves com o dono e faça a vistoria por fotos.
            Devolva no mesmo lugar. Proteção básica incluída em todas as reservas.
          </p>
        </section>

        <section className="panel">
          <h3 className="panel-h">
            Avaliações{stats?.review_count ? ` · ${rating(stats.avg_rating)} (${stats.review_count})` : ""}
          </h3>
          {reviews?.length ? (
            <ul className="flex flex-col gap-3.5">
              {reviews.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <Avatar name={r.author_name ?? "?"} url={r.author_avatar_url} size={36} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-sm">{firstName(r.author_name ?? "Locatário")}</b>
                      <Stars value={r.rating ?? 0} size={12} />
                    </div>
                    {r.comment && <p className="text-sm text-muted mt-0.5">{r.comment}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">
              Este carro ainda não tem avaliações. Seja a primeira pessoa a alugar e avaliar.
            </p>
          )}
        </section>
      </main>

      <StickyFooter>
        <div className="price">
          {brl(car.price_per_day_cents)}
          <small> /dia</small>
        </div>
        {isOwner ? (
          <Link href={`/earn/cars/${car.id}/edit`} className="cta flex-1">
            Editar anúncio
          </Link>
        ) : car.is_listed ? (
          <Link href={`/cars/${car.id}/book`} className="cta flex-1">
            Reservar
          </Link>
        ) : (
          <span className="cta flex-1" aria-disabled="true">
            Indisponível
          </span>
        )}
      </StickyFooter>
    </>
  );
}
