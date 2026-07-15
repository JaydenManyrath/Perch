/**
 * Deterministic distance + walking-ETA math (B9). Shared by the life-map places
 * pipeline AND the negotiation routine-fit scout (B10) — one source of truth for
 * "4 min from your usual coffee spot". No LLM ever touches these numbers.
 */

const EARTH_RADIUS_M = 6_371_000;
const AVG_WALK_METERS_PER_MIN = 80; // ~4.8 km/h, a steady walking pace

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in meters between two points (haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Deterministic walking time in whole minutes (rounded, min 1 for any real gap). */
export function walkingMinutes(a: LatLng, b: LatLng): number {
  const meters = haversineMeters(a, b);
  if (meters === 0) return 0;
  return Math.max(1, Math.round(meters / AVG_WALK_METERS_PER_MIN));
}

/**
 * Nearest anchor to a point, with the deterministic walking ETA. Ties broken by the
 * anchor's `label` (stable ordering) so results never reshuffle run-to-run.
 */
export function nearestAnchor<T extends LatLng & { label: string }>(
  from: LatLng,
  anchors: T[],
): { anchor: T; minutes: number; meters: number } | null {
  if (anchors.length === 0) return null;
  let best: { anchor: T; minutes: number; meters: number } | null = null;
  for (const anchor of anchors) {
    const meters = haversineMeters(from, anchor);
    if (
      best === null ||
      meters < best.meters ||
      (meters === best.meters && anchor.label < best.anchor.label)
    ) {
      best = { anchor, minutes: walkingMinutes(from, anchor), meters };
    }
  }
  return best;
}
