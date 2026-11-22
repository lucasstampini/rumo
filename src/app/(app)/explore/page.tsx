import type { Metadata } from "next";
import { ExploreView, type ExploreCar } from "@/components/car/ExploreView";
import { firstPhoto, getBubble } from "@/lib/data";
import { carName } from "@/lib/format";
import { isInsideBubble } from "@/lib/geo";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Explorar" };

export default async function ExplorePage() {
  const { supabase, user, profile } = await requireProfile();
  const bubble = await getBubble(supabase, profile.bubble_id);

  const { data: cars, error } = await supabase
    .from("cars")
    .select(
      "id, make, model, year, category, transmission, price_per_day_cents, lat, lng, car_photos(url, position)",
    )
    .eq("bubble_id", bubble.id)
    .eq("is_listed", true)
    .neq("owner_id", user.id);
  if (error) throw new Error("Não foi possível carregar os carros.");

  // Explorar mostra só carros dentro do círculo da bolha (SPEC §5).
  const inBubble = cars.filter((c) => isInsideBubble(c, bubble));
  const { data: ratings } = await supabase
    .from("car_ratings")
    .select("car_id, avg_rating")
    .in(
      "car_id",
      inBubble.map((c) => c.id),
    );
  const ratingByCar = new Map((ratings ?? []).map((r) => [r.car_id, r.avg_rating]));

  const list: ExploreCar[] = inBubble.map((c) => ({
    id: c.id,
    name: carName(c),
    category: c.category,
    transmission: c.transmission,
    priceCents: c.price_per_day_cents,
    lat: c.lat,
    lng: c.lng,
    photo: firstPhoto(c.car_photos),
    avgRating: ratingByCar.get(c.id) ?? null,
  }));

  return <ExploreView bubble={bubble} bubbleName={bubble.name} cars={list} />;
}
