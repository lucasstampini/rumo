"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/types";

/** Botão de envio que se desabilita enquanto a Server Action roda. */
export function SubmitButton({
  children,
  pendingLabel,
  className = "cta w-full",
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} {...rest}>
      {pending ? (pendingLabel ?? "Enviando…") : children}
    </button>
  );
}

/** Mensagem de erro/sucesso devolvida pela Server Action. */
export function FormAlert({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p role="alert" className="alert alert-error">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p role="status" className="alert alert-ok">
        {state.ok}
      </p>
    );
  }
  return null;
}
