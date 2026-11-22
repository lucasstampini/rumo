"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import { createReview } from "@/lib/actions/reviews";

/** Avaliação de 1 a 5 estrelas + comentário opcional. */
export function ReviewForm({ bookingId, targetName }: { bookingId: string; targetName: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0) {
      setError("Escolha de 1 a 5 estrelas.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createReview({ booking_id: bookingId, rating: stars, comment });
    if (result?.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <fieldset>
        <legend className="font-bold mb-2">Como foi com {targetName}?</legend>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
              className="p-1 rounded-lg"
              onClick={() => setStars(n)}
            >
              <Star size={34} aria-hidden fill={n <= stars ? "#f2a516" : "#dbe5de"} stroke="none" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        Comentário <span className="font-normal text-muted">(opcional)</span>
        <textarea
          className="input min-h-[80px]"
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi a experiência."
        />
      </label>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      <button type="submit" className="cta w-full" disabled={busy}>
        {busy ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
