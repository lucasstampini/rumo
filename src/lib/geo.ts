/** Geografia da bolha (SPEC §5). Funções puras. */

export type LatLng = { lat: number; lng: number };
export type Bubble = { center_lat: number; center_lng: number; radius_m: number };

const EARTH_RADIUS_M = 6_371_000;
const WALK_DETOUR_FACTOR = 1.3; // linha reta → caminho real
const WALK_SPEED_M_PER_MIN = 80;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta, em metros. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutos a pé = Haversine × 1,3 ÷ 80 m/min, arredondado para cima (mínimo 1). */
export function walkMinutes(from: LatLng, to: LatLng): number {
  const minutes = (haversineMeters(from, to) * WALK_DETOUR_FACTOR) / WALK_SPEED_M_PER_MIN;
  return Math.max(1, Math.ceil(minutes));
}

export function bubbleCenter(bubble: Bubble): LatLng {
  return { lat: bubble.center_lat, lng: bubble.center_lng };
}

export function isInsideBubble(point: LatLng, bubble: Bubble): boolean {
  return haversineMeters(point, bubbleCenter(bubble)) <= bubble.radius_m;
}

/** Ponto a `meters` de `origin` na direção `bearingDeg` (0 = norte, 90 = leste). */
export function offsetMeters(origin: LatLng, meters: number, bearingDeg: number): LatLng {
  const dLat = (meters * Math.cos(rad(bearingDeg))) / 111_320;
  const dLng = (meters * Math.sin(rad(bearingDeg))) / (111_320 * Math.cos(rad(origin.lat)));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}
