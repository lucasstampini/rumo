"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const reviewSchema = z.object({
  booking_id: z.uuid(),
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: z.string().trim().max(500, "Comentário: no máximo 500 caracteres.").optional(),
});

/** Avaliação mútua depois do aluguel concluído. Quem é avaliado é decidido aqui, não pelo cliente. */
export async function createReview(input: unknown): Promise<ActionState> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { booking_id, rating, comment } = parsed.data;

  const { supabase, user } = await getUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, renter_id, car_id, car:cars!inner(owner_id)")
    .eq("id", booking_id)
    .maybeSingle();
  if (!booking) return { error: "Reserva não encontrada." };
  if (booking.status !== "completed") {
    return { error: "Só dá para avaliar depois que o aluguel for concluído." };
  }

  const isRenter = booking.renter_id === user.id;
  const isOwner = booking.car.owner_id === user.id;
  if (!isRenter && !isOwner) return { error: "Reserva não encontrada." };
  const target_id = isRenter ? booking.car.owner_id : booking.renter_id;

  const { error } = await supabase
    .from("reviews")
    .insert({ booking_id, author_id: user.id, target_id, rating, comment: comment || null });
  if (error) {
    // 23505 = unique (booking_id, author_id)
    return {
      error: error.code === "23505" ? "Você já avaliou este aluguel." : "Não foi possível enviar a avaliação.",
    };
  }

  revalidatePath(`/rentals/${booking_id}`);
  revalidatePath(`/earn/bookings/${booking_id}`);
  revalidatePath(`/cars/${booking.car_id}`);
  revalidatePath("/profile");
  return { ok: "Avaliação enviada. Obrigado!" };
}
