import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export type Db = SupabaseClient<Database>;
export type Tables = Database["public"]["Tables"];
export type CarRow = Tables["cars"]["Row"];
export type BookingRow = Tables["bookings"]["Row"];
export type BubbleRow = Tables["bubbles"]["Row"];

/** Bolha do usuário (ou a única bolha piloto, se o perfil ainda não tiver uma). */
export async function getBubble(supabase: Db, bubbleId: string | null): Promise<BubbleRow> {
  const query = supabase.from("bubbles").select("id, name, center_lat, center_lng, radius_m");
  const { data, error } = await (
    bubbleId ? query.eq("id", bubbleId) : query.order("name").limit(1)
  ).maybeSingle();
  if (error || !data) throw new Error("Não foi possível carregar a sua bolha.");
  return data;
}

/** Primeira foto de um carro (por posição). */
export function firstPhoto(photos: { url: string; position: number }[] | null): string | null {
  if (!photos?.length) return null;
  return [...photos].sort((a, b) => a.position - b.position)[0].url;
}

/** Dias bloqueados + períodos reservados de um carro, para o calendário. */
export async function getCarCalendar(supabase: Db, carId: string) {
  const [blocked, busy] = await Promise.all([
    supabase.from("car_blocked_dates").select("day").eq("car_id", carId),
    supabase.rpc("car_busy_ranges", { p_car: carId }),
  ]);
  return {
    blockedDays: (blocked.data ?? []).map((b) => b.day),
    busyRanges: busy.data ?? [],
  };
}
