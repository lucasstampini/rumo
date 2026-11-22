"use client";

import { Footprints } from "lucide-react";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import { type Bubble, walkMinutes } from "@/lib/geo";

/** "X min a pé" a partir da posição do usuário (ou do centro da bolha). */
export function WalkMinutes({
  bubble,
  lat,
  lng,
  long = false,
}: {
  bubble: Bubble;
  lat: number;
  lng: number;
  long?: boolean;
}) {
  const pos = useUserPosition(bubble);
  const min = walkMinutes(pos, { lat, lng });
  return (
    <span className="inline-flex items-center gap-[3px] text-green-d font-bold">
      <Footprints size={13} aria-hidden strokeWidth={2.4} />
      {min} min{long ? " a pé" : ""}
      {!long && <span className="sr-only"> a pé</span>}
    </span>
  );
}
