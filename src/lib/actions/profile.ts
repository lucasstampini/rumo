"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Digite seu nome.").max(80, "Nome muito longo.").optional(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{10,11}$/.test(v.replace(/\D/g, "")), {
      message: "Digite o telefone com DDD, por exemplo (11) 91234-5678.",
    })
    .optional(),
  // caminhos dentro dos buckets `avatars` e `documents` (enviados pelo navegador)
  avatar_path: z.string().max(200).optional(),
  cnh_path: z.string().max(200).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Salva dados do próprio perfil (onboarding e tela de perfil). Enviar a CNH marca `verified`. */
export async function saveProfile(input: ProfileInput): Promise<ActionState> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await getUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo." };

  const { full_name, phone, avatar_path, cnh_path } = parsed.data;
  const ownFolder = `${user.id}/`;
  if ((avatar_path && !avatar_path.startsWith(ownFolder)) || (cnh_path && !cnh_path.startsWith(ownFolder))) {
    return { error: "Arquivo inválido. Envie a imagem de novo." };
  }

  const patch: {
    full_name?: string;
    phone?: string | null;
    avatar_url?: string;
    cnh_url?: string;
  } = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (phone !== undefined) patch.phone = phone === "" ? null : phone;
  if (avatar_path) {
    patch.avatar_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatar_path}`;
  }
  if (cnh_path) patch.cnh_url = cnh_path;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) return { error: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/profile");
  return { ok: "Dados salvos." };
}
