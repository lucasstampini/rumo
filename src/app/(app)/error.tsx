"use client";

import { TriangleAlert } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <div className="panel empty" role="alert">
        <TriangleAlert size={40} aria-hidden className="text-red" />
        <b className="text-ink text-base">Não foi possível carregar</b>
        <span>
          {error.message && !error.digest
            ? error.message
            : "Pode ser a sua conexão ou uma falha nossa. Tente de novo em instantes."}
        </span>
        <button type="button" className="cta !py-3 !px-5" onClick={reset}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
