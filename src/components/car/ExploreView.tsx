"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { MapPin as MapPinIcon, Star } from "lucide-react";
import { WalkMinutes } from "@/components/car/WalkMinutes";
import type { MapPin } from "@/components/map/BubbleMap";
import { brl, rating } from "@/lib/format";
import { type Bubble, walkMinutes } from "@/lib/geo";
import { useUserPosition } from "@/lib/hooks/useUserPosition";

const BubbleMap = dynamic(() => import("@/components/map/BubbleMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton h-full w-full !rounded-none" role="status" aria-label="Carregando mapa" />
  ),
});

export type ExploreCar = {
  id: string;
  name: string;
  category: "economy" | "sedan" | "suv";
  transmission: "manual" | "automatic";
  priceCents: number;
  lat: number;
  lng: number;
  photo: string | null;
  avgRating: number | null;
};

type Kind = "all" | "economy" | "automatic" | "suv";
const KINDS: [Kind, string][] = [
  ["all", "Todos"],
  ["economy", "Econômicos"],
  ["automatic", "Automáticos"],
  ["suv", "SUV"],
];
const PRICE_CAPS: [number, string][] = [
  [10000, "Até R$ 100"],
  [15000, "Até R$ 150"],
];

function matchesKind(car: ExploreCar, kind: Kind): boolean {
  if (kind === "all") return true;
  if (kind === "automatic") return car.transmission === "automatic";
  return car.category === kind;
}

export function ExploreView({
  bubble,
  bubbleName,
  cars,
}: {
  bubble: Bubble;
  bubbleName: string;
  cars: ExploreCar[];
}) {
  const [kind, setKind] = useState<Kind>("all");
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const userPos = useUserPosition(bubble);
  const cardRefs = useRef(new Map<string, HTMLAnchorElement>());

  const list = useMemo(
    () =>
      cars
        .filter((c) => matchesKind(c, kind) && (priceCap === null || c.priceCents <= priceCap))
        .map((c) => ({ ...c, walk: walkMinutes(userPos, c) }))
        .sort((a, b) => a.walk - b.walk),
    [cars, kind, priceCap, userPos],
  );
  const selectedId = list.some((c) => c.id === selected) ? selected : (list[0]?.id ?? null);
  const nearCount = cars.filter((c) => walkMinutes(userPos, c) <= 10).length;

  const pins: MapPin[] = list.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    label: brl(c.priceCents),
    title: `${c.name}, ${brl(c.priceCents)} por dia`,
  }));

  function selectFromMap(id: string) {
    setSelected(id);
    cardRefs.current
      .get(id)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  return (
    <main className="relative isolate overflow-hidden h-[calc(100dvh-var(--nav-h)-env(safe-area-inset-bottom,0px))]">
      <h1 className="sr-only">Explorar carros na bolha {bubbleName}</h1>

      <div className="absolute inset-0 z-0">
        <BubbleMap
          bubble={bubble}
          pins={pins}
          selectedId={selectedId}
          onSelect={selectFromMap}
          userPos={userPos}
        />
      </div>

      <div className="absolute top-2.5 inset-x-3.5 z-10 flex flex-col gap-2.5 pointer-events-none *:pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-card rounded-2xl px-3.5 py-3 shadow-[0_6px_20px_-8px_rgba(16,35,26,.35)]">
          <div className="size-[30px] rounded-[9px] bg-green grid place-items-center shrink-0">
            <MapPinIcon size={18} color="#fff" aria-hidden />
          </div>
          <div className="min-w-0">
            <b className="block text-[14.5px]">{bubbleName}, São Paulo</b>
            <small className="text-muted text-[12.5px]">Retirada hoje · a pé do seu endereço</small>
          </div>
        </div>
        <div
          role="group"
          aria-label="Filtros"
          className="flex gap-2 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 py-0.5"
        >
          {KINDS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {label}
            </button>
          ))}
          {PRICE_CAPS.map(([cap, label]) => (
            <button
              key={cap}
              type="button"
              className="chip"
              aria-pressed={priceCap === cap}
              onClick={() => setPriceCap(priceCap === cap ? null : cap)}
            >
              {label}
            </button>
          ))}
        </div>
        <p
          className="self-center bg-green-d text-white text-[11.5px] font-bold px-2.5 py-[5px] rounded-full tracking-[.02em] !pointer-events-none"
          aria-live="polite"
        >
          Bolha {bubbleName} · {nearCount} {nearCount === 1 ? "carro" : "carros"} em até 10 min
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-3 z-10 flex flex-col gap-1">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener"
          className="self-end mr-3.5 text-[10px] bg-white/85 text-ink px-1.5 rounded"
        >
          © OpenStreetMap
        </a>
        {list.length === 0 ? (
          <div className="panel mx-3.5 items-center text-center shadow-[0_10px_30px_-12px_rgba(16,35,26,.45)]">
            {cars.length === 0 ? (
              <>
                <b>Ainda não há carros na sua bolha</b>
                <span className="hint">Seja a primeira pessoa a anunciar e comece a ganhar.</span>
                <Link href="/earn" className="cta !py-3 !px-5">
                  Anunciar meu carro
                </Link>
              </>
            ) : (
              <>
                <b>Nenhum carro com esses filtros</b>
                <span className="hint">Tente outra categoria ou faixa de preço.</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setKind("all");
                    setPriceCap(null);
                  }}
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <ul
            aria-label={`${list.length} ${list.length === 1 ? "carro encontrado" : "carros encontrados"}`}
            className="flex gap-3 overflow-x-auto px-3.5 py-1 snap-x snap-mandatory no-scrollbar"
          >
            {list.map((c) => (
              <li key={c.id} className="snap-center shrink-0 basis-[82%]" data-testid="car-card">
                <Link
                  href={`/cars/${c.id}`}
                  ref={(el) => {
                    if (el) cardRefs.current.set(c.id, el);
                    else cardRefs.current.delete(c.id);
                  }}
                  onFocus={() => setSelected(c.id)}
                  onPointerEnter={() => setSelected(c.id)}
                  data-selected={c.id === selectedId}
                  className="flex items-center gap-3 bg-card rounded-[20px] p-3 border-2 border-transparent data-[selected=true]:border-green shadow-[0_10px_30px_-12px_rgba(16,35,26,.45)]"
                >
                  <div className="thumb">{c.photo && <img src={c.photo} alt="" />}</div>
                  <div className="min-w-0 flex-1 flex flex-col gap-[3px]">
                    <b className="text-[15px] truncate">{c.name}</b>
                    <div className="meta">
                      <WalkMinutes bubble={bubble} lat={c.lat} lng={c.lng} />
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
                        <span className="sr-only">nota </span>
                        {rating(c.avgRating)}
                      </span>
                      <span>{c.transmission === "automatic" ? "Automático" : "Manual"}</span>
                    </div>
                    <div className="price">
                      {brl(c.priceCents)}
                      <small> /dia</small>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
