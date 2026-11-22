"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/actions/types";

/**
 * Botão que dispara uma Server Action de reserva (aceitar, recusar, iniciar…),
 * mostra o erro devolvido e atualiza a tela ao terminar.
 */
export function ActionButton({
  action,
  children,
  pendingLabel = "Enviando…",
  className = "cta w-full",
  confirm,
  disabled,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  /** texto de confirmação para ações destrutivas */
  confirm?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={className} disabled={pending || disabled} onClick={run}>
        {pending ? pendingLabel : children}
      </button>
      {error && (
        <p role="alert" className="alert alert-error basis-full">
          {error}
        </p>
      )}
    </>
  );
}
