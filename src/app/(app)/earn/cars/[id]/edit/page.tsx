import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarForm } from "@/components/earn/CarForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBubble } from "@/lib/data";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Editar anúncio" };

const reais = (cents: number) => (cents ? String(Math.round(cents / 100)) : "");

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();

  const { data: car } = await supabase
    .from("cars")
    .select("*, car_photos(url, position)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!car) notFound();
  const bubble = await getBubble(supabase, car.bubble_id);

  return (
    <>
      <PageHeader title="Editar anúncio" backHref={`/earn?car=${car.id}`} />
      <main>
        <CarForm
          userId={user.id}
          bubble={bubble}
          bubbleName={bubble.name}
          initial={{
            id: car.id,
            make: car.make,
            model: car.model,
            year: String(car.year),
            color: car.color,
            plate: car.plate,
            category: car.category,
            transmission: car.transmission,
            seats: String(car.seats),
            description: car.description ?? "",
            photos: [...car.car_photos].sort((a, b) => a.position - b.position).map((p) => p.url),
            position: { lat: car.lat, lng: car.lng },
            pickup_address: car.pickup_address,
            price_per_day: String(Math.round(car.price_per_day_cents / 100)),
            annual_ipva: reais(car.annual_ipva_cents),
            annual_insurance: reais(car.annual_insurance_cents),
            annual_maintenance: reais(car.annual_maintenance_cents),
            annual_depreciation: reais(car.annual_depreciation_cents),
            available_weekdays: car.available_weekdays,
          }}
        />
      </main>
    </>
  );
}
