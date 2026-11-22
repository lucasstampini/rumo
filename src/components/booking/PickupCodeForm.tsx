"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmPickupCode } from "@/lib/actions/bookings";

/** Dono digita o código de 4 dígitos que o locatário mostra na entrega das chaves. */
export function PickupCodeForm({ bookingId, renterName }: { bookingId: string; renterName: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmPickupCode(bookingId, code);
    if (result?.error) setError(result.error);
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <label className="field">
        Código de retirada
        <input
          className="input !text-center font-display !text-[28px] !font-black tracking-[.3em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4}"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          required
        />
        <span className="hint font-normal">
          Peça para {renterName} mostrar o código de 4 dígitos na tela do aluguel antes de entregar
          as chaves.
        </span>
      </label>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      <button type="submit" className="cta w-full" disabled={busy || code.length !== 4}>
        {busy ? "Conferindo…" : "Confirmar código"}
      </button>
    </form>
  );
}
