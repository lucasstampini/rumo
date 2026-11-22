import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, KeyRound } from "lucide-react";
import { StatusPill } from "@/components/ui/Pill";
import { rentalTab } from "@/lib/booking";
import { firstPhoto } from "@/lib/data";
import { brl, carName, dateRange, firstName } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Aluguéis" };

const TABS = [
  ["upcoming", "Próximos"],
  ["active", "Ativo"],
  ["past", "Anteriores"],
] as const;
type Tab = (typeof TABS)[number][0];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  upcoming: {
    title: "Nenhum aluguel marcado",
    text: "Ache um carro perto de você no mapa e reserve em menos de um minuto.",
  },
  active: {
    title: "Nenhum aluguel ativo",
    text: "Quando você retirar um carro, ele aparece aqui até a devolução.",
  },
  past: {
    title: "Nenhum aluguel anterior",
    text: "Seus aluguéis concluídos, cancelados ou recusados ficam guardados aqui.",
  },
};

export default async function RentalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireProfile();
  await supabase.rpc("expire_stale_requests");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, status, start_date, end_date, total_cents, car:cars!inner(make, model, year, car_photos(url, position), owner:profiles!cars_owner_id_fkey(full_name))",
    )
    .eq("renter_id", user.id)
    .order("start_date", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os seus aluguéis.");

  const byTab: Record<Tab, typeof bookings> = { upcoming: [], active: [], past: [] };
  for (const b of bookings) byTab[rentalTab(b.status)].push(b);
  byTab.upcoming.reverse(); // o mais próximo primeiro

  const requested = TABS.find(([k]) => k === sp.tab)?.[0];
  const tab: Tab = requested ?? (byTab.active.length ? "active" : byTab.upcoming.length ? "upcoming" : bookings.length ? "past" : "upcoming");
  const list = byTab[tab];

  return (
    <main className="page">
      <h1 className="h1">Aluguéis</h1>

      <nav aria-label="Filtrar aluguéis" className="grid grid-cols-3 gap-1 bg-card rounded-2xl p-1">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/rentals?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`text-center text-sm font-bold py-2.5 rounded-xl ${tab === k ? "bg-ink text-white" : "text-muted"}`}
          >
            {label}
            {byTab[k].length > 0 && <span className="font-medium"> ({byTab[k].length})</span>}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="panel empty">
          <KeyRound size={40} aria-hidden />
          <b className="text-ink">{EMPTY[tab].title}</b>
          <span>{EMPTY[tab].text}</span>
          <Link href="/explore" className="cta !py-3 !px-[18px]">
            Explorar carros
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((b) => {
            const photo = firstPhoto(b.car.car_photos);
            return (
              <li key={b.id}>
                <Link href={`/rentals/${b.id}`} className="panel !flex-row items-center !gap-3" data-testid="rental">
                  <div className="thumb !w-[78px] !h-[56px]">{photo && <img src={photo} alt="" />}</div>
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <b className="truncate">{carName(b.car)}</b>
                    <span className="meta">
                      {dateRange(b.start_date, b.end_date)} · {brl(b.total_cents)}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={b.status} />
                      <span className="hint truncate">de {firstName(b.car.owner.full_name)}</span>
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
