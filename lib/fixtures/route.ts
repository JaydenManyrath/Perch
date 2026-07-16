import type {
  CommuteScheduleResponse,
  GeoJSONLineString,
  RoutePoi,
  RouteResponse,
} from "@/lib/types/contract";
import { mapPlacesFixture } from "./places";

/**
 * Round 2 batch 2 (§12.6) - commute route from office to apartment.
 * Person C ships the real Mapbox Directions integration; this is the fixture fallback:
 * a straight line + a rough distance/duration estimate.
 */

// Great-circle distance in meters (Haversine).
function distanceMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Straight-line "route" as a fallback (Person C will replace with Mapbox Directions). */
export function buildFixtureRoute(input: {
  officeLat: number;
  officeLng: number;
  apartmentLat: number;
  apartmentLng: number;
}): RouteResponse {
  const office: [number, number] = [input.officeLng, input.officeLat];
  const apt: [number, number] = [input.apartmentLng, input.apartmentLat];
  // Insert a few interpolated points so the polyline draws smoothly on the map.
  const geometry: GeoJSONLineString = {
    type: "LineString",
    coordinates: interpolate(office, apt, 8),
  };
  const meters = distanceMeters(office, apt);
  // Walking pace ~ 1.4 m/s -> convert; keep it plausible for the demo.
  const durationSeconds = Math.max(300, Math.round(meters / 1.4));
  return { geometry, distanceMeters: Math.round(meters), durationSeconds };
}

function interpolate(a: [number, number], b: [number, number], steps: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Point-to-polyline distance (meters), min over segments. */
function pointToPolyMeters(pt: [number, number], line: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegmentMeters(pt, line[i], line[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

function pointToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  // Approximate on a local plane: convert deg to meters using a scale.
  const mPerDegLat = 111_111;
  const mPerDegLng = 111_111 * Math.cos((a[1] * Math.PI) / 180);
  const ax = a[0] * mPerDegLng;
  const ay = a[1] * mPerDegLat;
  const bx = b[0] * mPerDegLng;
  const by = b[1] * mPerDegLat;
  const px = p[0] * mPerDegLng;
  const py = p[1] * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** POIs along the route corridor - from the user's own places + a couple of seeded candidates. */
export function findPoisAlongRoute(
  geometry: GeoJSONLineString,
  kinds: string[],
  corridorMeters = 500,
): RoutePoi[] {
  const line = geometry.coordinates;
  const kindSet = new Set(kinds.map((k) => k.toLowerCase()));
  const own = mapPlacesFixture.places
    .filter((p) => (kindSet.size === 0 ? true : kindSet.has(p.kind.toLowerCase())))
    .map((p) => ({
      place: { id: p.id, label: p.label, kind: p.kind, lat: p.lat, lng: p.lng },
      distanceFromRouteMeters: Math.round(pointToPolyMeters([p.lng, p.lat], line)),
    }))
    .filter((r) => r.distanceFromRouteMeters <= corridorMeters * 2); // generous for the demo

  // A couple of seeded candidates the user has not visited yet.
  const candidates: RoutePoi[] = [
    {
      place: {
        id: "cand-coffee-1",
        label: "Roasted Fig (candidate)",
        kind: "coffee",
        lat: 47.6175,
        lng: -122.3260,
      },
      distanceFromRouteMeters: 80,
    },
    {
      place: {
        id: "cand-gym-1",
        label: "24 Hour Iron (candidate)",
        kind: "gym",
        lat: 47.6195,
        lng: -122.3345,
      },
      distanceFromRouteMeters: 140,
    },
  ].filter((c) => kindSet.size === 0 || kindSet.has(c.place.kind));

  return [...own, ...candidates].sort(
    (a, b) => a.distanceFromRouteMeters - b.distanceFromRouteMeters,
  );
}

/** Build a same-day schedule from the selected POIs; extends ItineraryDay. */
export function buildScheduleFromSelections(input: {
  apartmentId: string;
  selectedPlaceIds: string[];
}): CommuteScheduleResponse {
  const all = mapPlacesFixture.places;
  const chosen = input.selectedPlaceIds
    .map((id) => all.find((p) => p.id === id))
    .filter(Boolean) as (typeof all)[number][];

  // Anchor the day to a Monday morning commute.
  const items = [
    {
      time: "07:15",
      title: "Leave the apartment",
      kind: "settle" as const,
      note: "Head out with your work bag; leave 20 minutes of slack for a coffee stop.",
    },
    ...chosen.map((p) => ({
      time: p.kind === "gym" ? "06:15" : "07:30",
      title:
        p.kind === "coffee"
          ? `Coffee at ${p.label}`
          : p.kind === "gym"
          ? `Quick lift at ${p.label}`
          : p.kind === "grocery"
          ? `Grab groceries at ${p.label}`
          : `Stop at ${p.label}`,
      kind: p.kind === "gym" ? ("settle" as const) : ("errand" as const),
      lat: p.lat,
      lng: p.lng,
      note: `Along your commute route (about ${Math.round(p.frequency)}x/mo).`,
    })),
    {
      time: "08:30",
      title: "Standup at the office",
      kind: "settle" as const,
      note: "You budgeted 10 minutes of buffer time - use it.",
    },
    {
      time: "18:30",
      title: "Walk home the route",
      kind: "settle" as const,
      note: "Reverse the route; grab dinner near one of your marked spots if hungry.",
    },
  ];

  return {
    day: {
      date: new Date().toISOString().slice(0, 10),
      dayLabel: "Your commute day",
      items,
    },
  };
}
