"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/lib/actions/auth";
import { FormAlert, SubmitButton } from "@/components/ui/Form";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action] = useActionState(mode === "login" ? signIn : signUp, null);
  const isSignup = mode === "signup";

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-5">
        <Link href="/" aria-label="RUMO, voltar ao início" className="self-start rounded-2xl">
          <img src="/logo.png" alt="" width={56} height={56} className="w-14 rounded-2xl" />
        </Link>
        <div>
          <h1 className="h1 !mt-0">{isSignup ? "Criar conta" : "Entrar"}</h1>
          <p className="text-muted mt-1">
            {isSignup
              ? "Leva menos de um minuto. Depois é só achar um carro perto de você."
              : "Bem-vindo de volta à bolha Butantã."}
          </p>
        </div>
        <form action={action} className="flex flex-col gap-4">
          {isSignup && (
            <label className="field">
              Nome completo
              <input
                className="input"
                name="full_name"
                autoComplete="name"
                required
                minLength={2}
                placeholder="Como você se chama?"
              />
            </label>
          )}
          <label className="field">
            E-mail
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="voce@email.com"
            />
          </label>
          <label className="field">
            Senha
            <input
              className="input"
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder={isSignup ? "Pelo menos 6 caracteres" : "Sua senha"}
            />
          </label>
          <FormAlert state={state} />
          <SubmitButton pendingLabel={isSignup ? "Criando conta…" : "Entrando…"}>
            {isSignup ? "Criar conta" : "Entrar"}
          </SubmitButton>
        </form>
        <p className="text-center text-muted">
          {isSignup ? "Já tem conta? " : "Ainda não tem conta? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-bold text-green-d underline underline-offset-2"
          >
            {isSignup ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </div>
    </main>
  );
}
