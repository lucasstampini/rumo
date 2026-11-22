"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const credentials = z.object({
  email: z.email("Digite um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const signUpSchema = credentials.extend({
  full_name: z
    .string()
    .trim()
    .min(2, "Digite seu nome.")
    .max(80, "Nome muito longo."),
});

function authMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/already registered|already been registered/i.test(message))
    return "Este e-mail já tem conta. Entre com a sua senha.";
  if (/rate limit/i.test(message)) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/email not confirmed/i.test(message))
    return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  return "Não foi possível concluir. Tente de novo.";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authMessage(error.message) };
  redirect("/explore");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name } },
  });
  if (error) return { error: authMessage(error.message) };
  if (!data.session) {
    // "Confirm email" ligado no Supabase: sem sessão até confirmar.
    return { ok: "Conta criada! Confirme pelo link que enviamos ao seu e-mail e depois entre." };
  }
  redirect("/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
