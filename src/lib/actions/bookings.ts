"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type BookingStatus,
  canTransition,
  generatePickupCode,
  INSPECTION_ANGLES,
  inspectionComplete,
  type Role,
} from "@/lib/booking";
import { validateDraft } from "@/lib/booking-server";
import type { Db } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";
import { type ActionState, friendlyDbError } from "./types";

const SESSION_EXPIRED = { error: "Sua sessão expirou. Entre de novo." };
const NOT_FOUND = { error: "Reserva não encontrada." };
const idSchema = z.uuid();

function revalidateBooking(id: string) {
  revalidatePath("/rentals");
  revalidatePath(`/rentals/${id}`);
  revalidatePath("/earn");
  revalidatePath(`/earn/bookings/${id}`);
}

/** Confere datas e disponibilidade antes de ir para o pagamento (mensagem amigável de conflito). */
export async function checkBookingDraft(input: unknown): Promise<ActionState> {
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;
  const result = await validateDraft(supabase, user.id, input);
  return result.ok ? { ok: "Datas livres." } : { error: result.error };
}

/** "Simular pagamento": cria a reserva já paga (status `requested`) e vai para a tela de sucesso. */
export async function createBooking(input: unknown): Promise<ActionState> {
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;

  const result = await validateDraft(supabase, user.id, input);
  if (!result.ok) return { error: result.error };
  const { draft, quote } = result;

  // O trigger do banco recalcula os valores e fixa status/pagamento; a exclusion constraint
  // barra corrida entre duas pessoas reservando as mesmas datas.
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      car_id: draft.car_id,
      renter_id: user.id,
      start_date: draft.start,
      end_date: draft.end,
      protection: draft.protection,
      payment_method: draft.payment_method,
      days: quote.days,
      subtotal_cents: quote.subtotalCents,
      protection_cents: quote.protectionCents,
      service_fee_cents: quote.serviceFeeCents,
      total_cents: quote.totalCents,
      owner_payout_cents: quote.ownerPayoutCents,
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendlyDbError(error) };

  revalidateBooking(data.id);
  redirect(`/bookings/${data.id}/pay`);
}

type LoadedBooking = {
  id: string;
  status: BookingStatus;
  pickup_code: string | null;
  pickup_confirmed_at: string | null;
  role: Role;
};

/** Carrega a reserva (o RLS já limita a locatário/dono) e descobre o papel de quem chamou. */
async function loadBooking(supabase: Db, userId: string, id: unknown): Promise<LoadedBooking | null> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id, status, renter_id, pickup_code, pickup_confirmed_at, car:cars!inner(owner_id)")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!data) return null;
  const role: Role | null =
    data.car.owner_id === userId ? "owner" : data.renter_id === userId ? "renter" : null;
  if (!role) return null;
  return {
    id: data.id,
    status: data.status,
    pickup_code: data.pickup_code,
    pickup_confirmed_at: data.pickup_confirmed_at,
    role,
  };
}

type Precheck = { error?: string; patch?: { pickup_code?: string } };

/** Aplica uma transição de status depois de checar papel e status de origem (SPEC §6). */
async function transition(
  id: unknown,
  to: BookingStatus,
  okMessage: string,
  extra?: (b: LoadedBooking, supabase: Db) => Promise<Precheck>,
): Promise<ActionState> {
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;
  const booking = await loadBooking(supabase, user.id, id);
  if (!booking) return NOT_FOUND;

  if (!canTransition(booking.status, to, booking.role)) {
    return { error: "Esta reserva já mudou de situação. Atualize a página." };
  }
  const pre: Precheck = extra ? await extra(booking, supabase) : {};
  if (pre.error) return { error: pre.error };

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: to, ...pre.patch })
    .eq("id", booking.id)
    .eq("status", booking.status) // se alguém mudou no meio do caminho, não atualiza nada
    .select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "Esta reserva já mudou de situação. Atualize a página." };

  revalidateBooking(booking.id);
  return { ok: okMessage };
}

/** Dono aceita: gera o código de retirada de 4 dígitos. */
export async function acceptBooking(id: string): Promise<ActionState> {
  return transition(id, "accepted", "Reserva aceita. O locatário já recebeu o código de retirada.", async () => ({
    patch: { pickup_code: generatePickupCode(() => randomInt(10_000) / 10_000) },
  }));
}

/** Dono recusa: pagamento estornado (simulado). */
export async function rejectBooking(id: string): Promise<ActionState> {
  return transition(id, "rejected", "Pedido recusado. O pagamento foi estornado ao locatário.");
}

/** Locatário cancela antes da retirada: pagamento estornado (simulado). */
export async function cancelBooking(id: string): Promise<ActionState> {
  return transition(id, "cancelled", "Reserva cancelada. O valor pago foi estornado.");
}

async function inspectionAngles(supabase: Db, bookingId: string, kind: "pickup" | "return") {
  const { data } = await supabase
    .from("inspection_photos")
    .select("angle")
    .eq("booking_id", bookingId)
    .eq("kind", kind);
  return (data ?? []).map((p) => p.angle);
}

/** Locatário inicia o aluguel: exige código conferido pelo dono + 4 fotos de retirada. */
export async function startRental(id: string): Promise<ActionState> {
  return transition(id, "active", "Aluguel iniciado. Boa viagem!", async (b, supabase) => {
    if (!inspectionComplete(await inspectionAngles(supabase, b.id, "pickup"))) {
      return { error: "Faltam fotos da vistoria de retirada." };
    }
    if (!b.pickup_confirmed_at) {
      return { error: "Mostre o código ao dono: ele ainda precisa confirmar a entrega das chaves." };
    }
    return {};
  });
}

/** Dono confirma a devolução: exige as 4 fotos de devolução do locatário. */
export async function confirmReturn(id: string): Promise<ActionState> {
  return transition(id, "completed", "Devolução confirmada. Aluguel concluído!", async (b, supabase) => {
    if (!inspectionComplete(await inspectionAngles(supabase, b.id, "return"))) {
      return { error: "O locatário ainda não enviou as 4 fotos de devolução." };
    }
    return {};
  });
}

/** Dono digita o código que o locatário mostra na entrega das chaves. */
export async function confirmPickupCode(id: string, code: string): Promise<ActionState> {
  const parsedCode = z.string().regex(/^\d{4}$/, "Digite os 4 dígitos do código.").safeParse(code);
  if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };

  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;
  const booking = await loadBooking(supabase, user.id, id);
  if (!booking) return NOT_FOUND;
  if (booking.role !== "owner") return { error: "Só o dono do carro confirma o código." };
  if (booking.status !== "accepted") {
    return { error: "Esta reserva já mudou de situação. Atualize a página." };
  }
  if (booking.pickup_confirmed_at) return { ok: "Código já confirmado." };
  if (booking.pickup_code !== parsedCode.data) {
    return { error: "Código incorreto. Confira os 4 dígitos na tela do locatário." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ pickup_confirmed_at: new Date().toISOString() })
    .eq("id", booking.id)
    .eq("status", "accepted");
  if (error) return { error: friendlyDbError(error) };

  revalidateBooking(booking.id);
  return { ok: "Código confirmado. O locatário já pode iniciar o aluguel." };
}

const photoSchema = z.object({
  booking_id: z.uuid(),
  kind: z.enum(["pickup", "return"]),
  angle: z.enum(INSPECTION_ANGLES),
  path: z.string().min(10).max(200),
});

/** Registra uma foto de vistoria já enviada ao bucket `inspections` (pasta = id da reserva). */
export async function recordInspectionPhoto(input: unknown): Promise<ActionState> {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { error: "Foto inválida. Tente de novo." };
  const { booking_id, kind, angle, path } = parsed.data;

  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;
  const booking = await loadBooking(supabase, user.id, booking_id);
  if (!booking) return NOT_FOUND;
  if (booking.role !== "renter") return { error: "A vistoria é feita pelo locatário." };

  const expected: BookingStatus = kind === "pickup" ? "accepted" : "active";
  if (booking.status !== expected) {
    return { error: "Esta vistoria não está aberta agora. Atualize a página." };
  }
  if (!path.startsWith(`${booking.id}/`)) return { error: "Foto inválida. Tente de novo." };

  const { error } = await supabase
    .from("inspection_photos")
    .upsert({ booking_id: booking.id, kind, angle, url: path }, { onConflict: "booking_id,kind,angle" });
  if (error) return { error: "Não foi possível salvar a foto. Tente de novo." };

  revalidateBooking(booking.id);
  return { ok: "Foto salva." };
}
