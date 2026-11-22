"use client";

import { useState } from "react";

/** Botão "Copiar código" do indique-e-ganhe. */
export function CopyCode({ code }: { code: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMsg(`Código ${code} copiado`);
    } catch {
      setMsg(`Seu código: ${code}`);
    }
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <>
      <button type="button" className="ghost shrink-0" onClick={copy}>
        Copiar código
      </button>
      <span role="status" className="sr-only">
        {msg}
      </span>
      {msg && (
        <span
          aria-hidden
          className="absolute inset-x-3 bottom-3 rounded-xl bg-ink text-white text-sm font-semibold px-3 py-2 text-center"
        >
          {msg}
        </span>
      )}
    </>
  );
}
