import "server-only";
import { z } from "zod";
import { isRangeAvailable } from "@/lib/booking";
import { type Db, getCarCalendar } from "@/lib/data";
import { isISODate, todayISO } from "@/lib/dates";
import { countDays, isValidDayCount, MAX_DAYS, type Quote, quote } from "@/lib/pricing";

const isoDate = z.string().refine(isISODate, "Data inválida.");

export const bookingDraftSchema = z
  .object({
    car_id: z.uuid("Carro inválido."),
    start: isoDate,
    end: isoDate,
    protection: z.enum(["basic", "full"]),
    payment_method: z.enum(["pix", "card"]),
  })
  .refine((d) => d.end >= d.start, "A devolução não pode ser antes da retirada.");

export type BookingDraft = z.infer<typeof bookingDraftSchema>;

export type DraftCar = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  price_per_day_cents: number;
  pickup_address: string;
  owner_name: string;
};

export type DraftResult =
  | { ok: false; error: string }
  | { ok: true; draft: BookingDraft; car: DraftCar; quote: Quote };

/**
 * Confere um pedido de reserva antes de cobrar: carro existe e está anunciado, não é do próprio
 * usuário, período válido e livre. O banco repete tudo isso (trigger + exclusion constraint);
 * aqui é para responder com uma mensagem clara.
 */
export async function validateDraft(supabase: Db, userId: string, input: unknown): Promise<DraftResult> {
  const parsed = bookingDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const draft = parsed.data;

  const { data: car } = await supabase
    .from("cars")
    .select(
      "id, owner_id, make, model, year, price_per_day_cents, pickup_address, is_listed, available_weekdays, owner:profiles!cars_owner_id_fkey(full_name)",
    )
    .eq("id", draft.car_id)
    .maybeSingle();

  if (!car || !car.is_listed) {
    return { ok: false, error: "Este carro não está mais disponível para aluguel." };
  }
  if (car.owner_id === userId) {
    return { ok: false, error: "Você não pode alugar o seu próprio carro." };
  }

  const days = countDays(draft.start, draft.end);
  if (!isValidDayCount(days)) {
    return { ok: false, error: `Escolha de 1 a ${MAX_DAYS} diárias.` };
  }
  const today = todayISO();
  if (draft.start < today) {
    return { ok: false, error: "A retirada não pode ser em uma data que já passou." };
  }

  const calendar = await getCarCalendar(supabase, car.id);
  const free = isRangeAvailable(draft.start, draft.end, {
    availableWeekdays: car.available_weekdays,
    blockedDays: calendar.blockedDays,
    busyRanges: calendar.busyRanges,
    today,
  });
  if (!free) {
    return {
      ok: false,
      error:
        "Essas datas não estão mais livres para este carro. Volte e escolha outro período.",
    };
  }

  return {
    ok: true,
    draft,
    car: {
      id: car.id,
      owner_id: car.owner_id,
      make: car.make,
      model: car.model,
      year: car.year,
      price_per_day_cents: car.price_per_day_cents,
      pickup_address: car.pickup_address,
      owner_name: car.owner.full_name,
    },
    quote: quote({ pricePerDayCents: car.price_per_day_cents, days, protection: draft.protection }),
  };
}
