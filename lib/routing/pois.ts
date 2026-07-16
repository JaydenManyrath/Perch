import { mapboxToken } from "./mapbox";
import type { GeoJSONLineString, RoutePoi } from "@/lib/types/contract";

/**
 * POI search along the commute corridor (RC8). Person C searches Mapbox for coffee/gym
 * candidates near the route (or falls back to seeded candidates when there is no key),
 * and returns them with a deterministic distance-from-route. Person B's /api/route/pois
 * merges these with the user's own places and owns the final along-route filter.
 */

const CORRIDOR_METERS = 500; // a POI within this of the polyline counts as "along route"
const M_PER_DEG_LAT = 111_320;

// Seeded coffee/gym candidates around Seattle for the demo fallback.
const SEED_POIS: { id: string; label: string; kind: string; lat: number; lng: number }[] = [
  { id: "poi-coffee-victrola", label: "Victrola Coffee Roasters", kind: "coffee", lat: 47.6150, lng: -122.3270 },
  { id: "poi-coffee-analog", label: "Analog Coffee", kind: "coffee", lat: 47.6190, lng: -122.3210 },
  { id: "poi-coffee-espresso-vivace", label: "Espresso Vivace", kind: "coffee", lat: 47.6175, lng: -122.3215 },
  { id: "poi-gym-sbp", label: "Seattle Bouldering Project", kind: "gym", lat: 47.5790, lng: -122.3200 },
  { id: "poi-gym-la-fitness", label: "LA Fitness SLU", kind: "gym", lat: 47.6220, lng: -122.3380 },
  { id: "poi-gym-community", label: "Miller Community Center Gym", kind: "gym", lat: 47.6205, lng: -122.3175 },
];

/** Meters-per-degree longitude shrinks with latitude. */
function mPerDegLng(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Deterministic point-to-segment distance in meters (local equirectangular projection). */
export function pointToSegmentMeters(
  p: { lat: number; lng: number },
  a: [number, number], // [lng, lat]
  b: [number, number],
): number {
  const lat0 = p.lat;
  const kx = mPerDegLng(lat0);
  const ky = M_PER_DEG_LAT;
  const px = p.lng * kx;
  const py = p.lat * ky;
  const ax = a[0] * kx;
  const ay = a[1] * ky;
  const bx = b[0] * kx;
  const by = b[1] * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const segLen2 = dx * dx + dy * dy;
  let t = segLen2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / segLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Minimum distance in meters from a point to a polyline. */
export function distanceToPolylineMeters(
  p: { lat: number; lng: number },
  coords: [number, number][],
): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) {
    return pointToSegmentMeters(p, coords[0], coords[0]);
  }
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(min, pointToSegmentMeters(p, coords[i], coords[i + 1]));
  }
  return min;
}

/** Seeded candidates within the corridor, with deterministic distance, stable order. */
export function seededPoisAlongRoute(geometry: GeoJSONLineString, kinds: string[]): RoutePoi[] {
  const wanted = new Set(kinds.map((k) => k.toLowerCase()));
  return SEED_POIS.filter((p) => wanted.has(p.kind))
    .map((p) => ({
      place: { id: p.id, label: p.label, kind: p.kind, lat: p.lat, lng: p.lng },
      distanceFromRouteMeters: Math.round(distanceToPolylineMeters(p, geometry.coordinates)),
    }))
    .filter((rp) => rp.distanceFromRouteMeters <= CORRIDOR_METERS)
    .sort((a, b) =>
      a.distanceFromRouteMeters !== b.distanceFromRouteMeters
        ? a.distanceFromRouteMeters - b.distanceFromRouteMeters
        : a.place.id < b.place.id
          ? -1
          : 1,
    );
}

/**
 * Candidate POIs along the route (RC8). Uses Mapbox search when keyed, else the seeded
 * candidates. Never throws. The distance-from-route is computed deterministically here;
 * B's route recomputes/merges as the source of truth.
 */
export async function poiCandidatesAlongRoute(
  geometry: GeoJSONLineString,
  kinds: string[],
): Promise<{ pois: RoutePoi[]; source: "mapbox" | "fallback" }> {
  const token = mapboxToken();
  if (!token || geometry.coordinates.length === 0) {
    return { pois: seededPoisAlongRoute(geometry, kinds), source: "fallback" };
  }

  try {
    const mid = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
    const found: RoutePoi[] = [];
    for (const kind of kinds) {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(kind)}.json` +
        `?proximity=${mid[0]},${mid[1]}&types=poi&limit=10&access_token=${token}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        features?: { id?: string; text?: string; center?: [number, number] }[];
      };
      for (const f of data.features ?? []) {
        if (!f.center) continue;
        const place = { id: f.id ?? `${kind}-${f.center.join(",")}`, label: f.text ?? kind, kind, lat: f.center[1], lng: f.center[0] };
        const distanceFromRouteMeters = Math.round(distanceToPolylineMeters(place, geometry.coordinates));
        if (distanceFromRouteMeters <= CORRIDOR_METERS) found.push({ place, distanceFromRouteMeters });
      }
    }
    if (found.length === 0) return { pois: seededPoisAlongRoute(geometry, kinds), source: "fallback" };
    found.sort((a, b) => a.distanceFromRouteMeters - b.distanceFromRouteMeters);
    return { pois: found, source: "mapbox" };
  } catch (err) {
    console.warn("mapbox poi search failed, seeded fallback:", err);
    return { pois: seededPoisAlongRoute(geometry, kinds), source: "fallback" };
  }
}
