"use client";

import { useEffect, useState } from "react";
import { type Bubble, bubbleCenter, isInsideBubble, type LatLng } from "@/lib/geo";

const KEY = "rumo:pos";

/**
 * Posição do usuário para o "X min a pé".
 * Geolocalização do navegador; se negada, indisponível ou fora da bolha, usa o centro da bolha
 * (assim a demo funciona de qualquer lugar — ver DECISIONS.md).
 */
export function useUserPosition(bubble: Bubble): LatLng {
  const { center_lat, center_lng, radius_m } = bubble;
  const [pos, setPos] = useState<LatLng>(() => bubbleCenter(bubble));

  useEffect(() => {
    const area = { center_lat, center_lng, radius_m };
    const accept = (p: LatLng) => {
      if (isInsideBubble(p, area)) setPos(p);
    };
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) {
        accept(JSON.parse(cached) as LatLng);
        return;
      }
    } catch {
      // sessionStorage indisponível: segue para a geolocalização
    }
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const p = { lat: g.coords.latitude, lng: g.coords.longitude };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(p));
        } catch {
          // ignora
        }
        accept(p);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, [center_lat, center_lng, radius_m]);

  return pos;
}
