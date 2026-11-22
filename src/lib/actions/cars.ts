"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getBubble } from "@/lib/data";
import { isISODate, todayISO } from "@/lib/dates";
import { isInsideBubble } from "@/lib/geo";
import { getUser } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const SESSION_EXPIRED = { error: "Sua sessão expirou. Entre de novo." };
const MAX_PHOTOS = 6;

const reais = (label: string, max: number) =>
  z
    .number({ error: `${label}: digite um valor.` })
    .int(`${label}: use um valor inteiro em reais.`)
    .min(0, `${label}: o valor não pode ser negativo.`)
    .max(max, `${label}: valor alto demais.`);

const weekdays = z
  .array(z.number().int().min(0).max(6))
  .min(1, "Marque pelo menos um dia da semana disponível.")
  .transform((days) => [...new Set(days)].sort());

const carSchema = z.object({
  id: z.uuid().optional(),
  make: z.string().trim().min(2, "Digite a marca.").max(40),
  model: z.string().trim().min(1, "Digite o modelo.").max(40),
  year: z
    .number({ error: "Digite o ano." })
    .int()
    .min(1995, "Aceitamos carros de 1995 em diante.")
    .max(new Date().getFullYear() + 1, "Ano inválido."),
  color: z.string().trim().min(3, "Digite a cor.").max(30),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/, "Placa inválida. Use o formato ABC-1D23 ou ABC-1234."),
  category: z.enum(["economy", "sedan", "suv"]),
  transmission: z.enum(["manual", "automatic"]),
  seats: z.number().int().min(2).max(9),
  description: z.string().trim().max(500, "Descrição: no máximo 500 caracteres.").optional(),
  photos: z.array(z.string().min(1).max(500)).max(MAX_PHOTOS, `No máximo ${MAX_PHOTOS} fotos.`),
  lat: z.number({ error: "Marque no mapa onde o carro fica." }),
  lng: z.number({ error: "Marque no mapa onde o carro fica." }),
  pickup_address: z.string().trim().min(5, "Digite o endereço de retirada.").max(120),
  price_per_day: reais("Diária", 2000).min(30, "A diária mínima é R$ 30."),
  annual_ipva: reais("IPVA", 100_000),
  annual_insurance: reais("Seguro", 100_000),
  annual_maintenance: reais("Manutenção", 100_000),
  annual_depreciation: reais("Depreciação", 500_000),
  available_weekdays: weekdays,
});

export type CarInput = z.input<typeof carSchema>;

/** Cria ou edita o anúncio. Só o dono escreve (RLS), e o carro precisa ficar dentro da bolha. */
export async function saveCar(input: CarInput): Promise<ActionState> {
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const car = parsed.data;

  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;

  const { data: profile } = await supabase.from("profiles").select("bubble_id").eq("id", user.id).single();
  const bubble = await getBubble(supabase, profile?.bubble_id ?? null);
  if (!isInsideBubble(car, bubble)) {
    return {
      error: `O ponto de retirada precisa ficar dentro da bolha ${bubble.name} (o círculo verde do mapa).`,
    };
  }

  // Fotos: só arquivos da pasta do próprio usuário no bucket público, ou as imagens locais do seed.
  const ownPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-photos/${user.id}/`;
  if (!car.photos.every((url) => url.startsWith(ownPrefix) || /^\/cars\/[\w-]+\.svg$/.test(url))) {
    return { error: "Uma das fotos é inválida. Remova e envie de novo." };
  }

  const row = {
    make: car.make,
    model: car.model,
    year: car.year,
    color: car.color,
    plate: car.plate.includes("-") ? car.plate : `${car.plate.slice(0, 3)}-${car.plate.slice(3)}`,
    category: car.category,
    transmission: car.transmission,
    seats: car.seats,
    description: car.description || null,
    lat: car.lat,
    lng: car.lng,
    pickup_address: car.pickup_address,
    price_per_day_cents: car.price_per_day * 100,
    annual_ipva_cents: car.annual_ipva * 100,
    annual_insurance_cents: car.annual_insurance * 100,
    annual_maintenance_cents: car.annual_maintenance * 100,
    annual_depreciation_cents: car.annual_depreciation * 100,
    available_weekdays: car.available_weekdays,
  };

  let carId = car.id;
  if (carId) {
    const { data, error } = await supabase
      .from("cars")
      .update(row)
      .eq("id", carId)
      .eq("owner_id", user.id)
      .select("id");
    if (error || !data?.length) return { error: "Não foi possível salvar o anúncio. Tente de novo." };
  } else {
    const { data, error } = await supabase
      .from("cars")
      .insert({ ...row, owner_id: user.id, bubble_id: bubble.id, is_listed: true })
      .select("id")
      .single();
    if (error || !data) return { error: "Não foi possível criar o anúncio. Tente de novo." };
    carId = data.id;
  }

  // Substitui as fotos pela lista enviada, na ordem.
  await supabase.from("car_photos").delete().eq("car_id", carId);
  if (car.photos.length > 0) {
    const { error } = await supabase
      .from("car_photos")
      .insert(car.photos.map((url, position) => ({ car_id: carId, url, position })));
    if (error) return { error: "O anúncio foi salvo, mas as fotos não. Edite o anúncio e envie de novo." };
  }

  revalidatePath("/earn");
  revalidatePath("/explore");
  revalidatePath(`/cars/${carId}`);
  redirect(`/earn?car=${carId}&saved=1`);
}

/** Liga/desliga a visibilidade do carro no app. */
export async function setCarListed(carId: string, listed: boolean): Promise<ActionState> {
  const parsed = z.object({ carId: z.uuid(), listed: z.boolean() }).safeParse({ carId, listed });
  if (!parsed.success) return { error: "Dados inválidos." };
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;

  const { data, error } = await supabase
    .from("cars")
    .update({ is_listed: parsed.data.listed })
    .eq("id", parsed.data.carId)
    .eq("owner_id", user.id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível atualizar. Tente de novo." };

  revalidatePath("/earn");
  revalidatePath("/explore");
  return { ok: parsed.data.listed ? "Carro visível no app." : "Carro pausado." };
}

/** Dias da semana em que o carro pode ser alugado. */
export async function setCarWeekdays(carId: string, days: number[]): Promise<ActionState> {
  const parsed = z.object({ carId: z.uuid(), days: weekdays }).safeParse({ carId, days });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;

  const { data, error } = await supabase
    .from("cars")
    .update({ available_weekdays: parsed.data.days })
    .eq("id", parsed.data.carId)
    .eq("owner_id", user.id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível atualizar. Tente de novo." };

  revalidatePath("/earn");
  return { ok: "Disponibilidade atualizada." };
}

/** Bloqueia ou libera um dia específico do carro. */
export async function toggleBlockedDate(carId: string, day: string, blocked: boolean): Promise<ActionState> {
  const parsed = z
    .object({ carId: z.uuid(), day: z.string().refine(isISODate), blocked: z.boolean() })
    .safeParse({ carId, day, blocked });
  if (!parsed.success) return { error: "Dados inválidos." };
  if (parsed.data.day < todayISO()) return { error: "Esse dia já passou." };
  const { supabase, user } = await getUser();
  if (!user) return SESSION_EXPIRED;

  // O RLS só deixa o dono do carro escrever aqui.
  const { error } = parsed.data.blocked
    ? await supabase.from("car_blocked_dates").upsert({ car_id: parsed.data.carId, day: parsed.data.day })
    : await supabase.from("car_blocked_dates").delete().eq("car_id", parsed.data.carId).eq("day", parsed.data.day);
  if (error) return { error: "Não foi possível atualizar. Tente de novo." };

  revalidatePath("/earn");
  return { ok: parsed.data.blocked ? "Dia bloqueado." : "Dia liberado." };
}
