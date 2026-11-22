import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { WalkMinutes } from "@/components/car/WalkMinutes";
import { PageHeader } from "@/components/ui/PageHeader";
import { firstPhoto, getBubble, getCarCalendar } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { carName, firstName } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Sua reserva" };

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();

  const { data: car } = await supabase
    .from("cars")
    .select(
      "id, owner_id, bubble_id, make, model, year, lat, lng, price_per_day_cents, is_listed, available_weekdays, car_photos(url, position), owner:profiles!cars_owner_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!car) notFound();
  if (car.owner_id === user.id || !car.is_listed) redirect(`/cars/${car.id}`);

  const [bubble, calendar] = await Promise.all([
    getBubble(supabase, car.bubble_id),
    getCarCalendar(supabase, car.id),
  ]);
  const photo = firstPhoto(car.car_photos);

  return (
    <>
      <PageHeader title="Sua reserva" backHref={`/cars/${car.id}`} />
      <main>
        <div className="px-4 pt-4">
          <div className="panel !flex-row items-center">
            <div className="thumb !w-[76px] !h-[52px]">{photo && <img src={photo} alt="" />}</div>
            <div className="min-w-0">
              <b className="block truncate">{carName(car)}</b>
              <div className="meta">
                <span>{firstName(car.owner.full_name)}</span>
                <WalkMinutes bubble={bubble} lat={car.lat} lng={car.lng} long />
              </div>
            </div>
          </div>
        </div>
        <BookingForm
          carId={car.id}
          pricePerDayCents={car.price_per_day_cents}
          today={todayISO()}
          availableWeekdays={car.available_weekdays}
          blockedDays={calendar.blockedDays}
          busyRanges={calendar.busyRanges}
        />
      </main>
    </>
  );
}
