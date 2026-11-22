"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Copy, CreditCard } from "lucide-react";
import { createBooking } from "@/lib/actions/bookings";
import { brl } from "@/lib/format";

type Draft = {
  car_id: string;
  start: string;
  end: string;
  protection: "basic" | "full";
  payment_method: "pix" | "card";
};

const TEN_MINUTES = 600;

/** Payload no formato do "copia e cola" do Pix, mas com chave e CRC falsos: não é pagável. */
function fakePixPayload(totalCents: number, ref: string): string {
  const amount = (totalCents / 100).toFixed(2);
  return [
    "00020126",
    "580014br.gov.bcb.pix0136rumo-demo-",
    ref.slice(0, 26),
    "52040000",
    "5303986",
    `54${String(amount.length).padStart(2, "0")}${amount}`,
    "5802BR",
    "5904RUMO",
    "6009SAO PAULO",
    "62140510RUMOSIMULA",
    "6304FAKE",
  ].join("");
}

/** Pagamento simulado: QR + copia-e-cola + cronômetro; o botão cria a reserva paga. */
export function PixPayment({ draft, totalCents }: { draft: Draft; totalCents: number }) {
  const isPix = draft.payment_method === "pix";
  const payload = fakePixPayload(totalCents, `${draft.car_id}${draft.start}`.replace(/-/g, ""));
  const [qr, setQr] = useState<string | null>(null);
  const [left, setLeft] = useState(TEN_MINUTES);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPix) return;
    QRCode.toDataURL(payload, { margin: 1, width: 440, color: { dark: "#10231a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [isPix, payload]);

  useEffect(() => {
    if (!isPix) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isPix]);

  const expired = isPix && left === 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function pay() {
    setBusy(true);
    setError(null);
    const result = await createBooking(draft); // em caso de sucesso, redireciona
    if (result?.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="page !pt-4">
      <p className="alert alert-warn">
        Ambiente de demonstração: nenhum valor é cobrado. Use o botão <b>Simular pagamento</b>.
      </p>

      {isPix ? (
        <section className="panel items-center text-center">
          <h2 className="panel-h self-start">Pague com Pix</h2>
          <div className="size-[220px] rounded-2xl bg-white border border-line grid place-items-center overflow-hidden">
            {qr ? (
              <img src={qr} alt="QR code do Pix (simulado)" width={220} height={220} className={expired ? "opacity-20" : ""} />
            ) : (
              <div className="skeleton size-[200px]" role="status" aria-label="Gerando QR code" />
            )}
          </div>
          <div className="price !text-[26px]">{brl(totalCents)}</div>
          <p className="hint" role="timer" aria-live="off">
            {expired ? (
              <b className="text-red">Código expirado.</b>
            ) : (
              <>
                Este código expira em{" "}
                <b className="text-ink tabular-nums" data-testid="countdown">
                  {mm}:{ss}
                </b>
              </>
            )}
          </p>
          {expired ? (
            <button type="button" className="ghost w-full" onClick={() => setLeft(TEN_MINUTES)}>
              Gerar novo código
            </button>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <label className="field text-left">
                Pix copia e cola
                <input className="input !text-xs !font-mono" readOnly value={payload} onFocus={(e) => e.target.select()} />
              </label>
              <button type="button" className="ghost w-full" onClick={copy}>
                <Copy size={16} aria-hidden /> {copied ? "Código copiado" : "Copiar código"}
              </button>
              <span role="status" className="sr-only">
                {copied ? "Código copiado" : ""}
              </span>
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <h2 className="panel-h">Cartão de crédito</h2>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-green-l grid place-items-center text-green-d">
              <CreditCard size={22} aria-hidden />
            </div>
            <div>
              <b>Cartão de teste •••• 4242</b>
              <p className="hint">Em até 3x sem juros · {brl(totalCents)}</p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}

      <button type="button" className="cta w-full" disabled={busy || expired} onClick={pay}>
        {busy ? (isPix ? "Confirmando Pix…" : "Processando cartão…") : "Simular pagamento"}
      </button>
    </div>
  );
}
