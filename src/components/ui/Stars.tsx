import { Star } from "lucide-react";

/** Nota de 1 a 5 em estrelas (somente leitura). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          fill={n <= value ? "#f2a516" : "#dbe5de"}
          stroke="none"
        />
      ))}
    </span>
  );
}
