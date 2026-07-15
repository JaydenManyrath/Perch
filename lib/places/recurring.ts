import type { Place } from "@/lib/types/contract";
import { haversineMeters, walkingMinutes, type LatLng } from "./distance";

/** A single raw visit extracted from Google Maps Takeout. */
export type Visit = {
  lat: number;
  lng: number;
  label?: string;
  kind?: Place["kind"];
};

const CLUSTER_RADIUS_M = 150; // visits within this radius are the "same place"
const MIN_RECURRENCE = 3; // must be visited at least this many times to count

const KIND_LABEL: Record<Place["kind"], string> = {
  coffee: "Your usual coffee spot",
  gym: "Your gym",
  grocery: "Your grocery run",
  transit: "Your transit stop",
  show: "Your live-show haunt",
  work: "Your office",
  other: "A place you frequent",
};

/** Stable id from rounded coords so re-parsing the same Takeout yields the same ids. */
function placeId(lat: number, lng: number): string {
  return `place_${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

/**
 * Cluster raw visits into RECURRING places only (B6/B9). Deterministic: greedy
 * distance clustering, frequency threshold, stable ordering (frequency desc then id).
 * `nearestListingMinutes` is left undefined here (populated by the map route).
 */
export function recurringPlaces(visits: Visit[]): Place[] {
  const clusters: {
    center: LatLng;
    count: number;
    kinds: Record<string, number>;
    labels: Record<string, number>;
  }[] = [];

  for (const v of visits) {
    let target = clusters.find(
      (c) => haversineMeters(c.center, v) <= CLUSTER_RADIUS_M,
    );
    if (!target) {
      target = { center: { lat: v.lat, lng: v.lng }, count: 0, kinds: {}, labels: {} };
      clusters.push(target);
    }
    target.count += 1;
    if (v.kind) target.kinds[v.kind] = (target.kinds[v.kind] ?? 0) + 1;
    if (v.label) target.labels[v.label] = (target.labels[v.label] ?? 0) + 1;
  }

  const places = clusters
    .filter((c) => c.count >= MIN_RECURRENCE)
    .map((c) => {
      const kind = (mostCommon(c.kinds) as Place["kind"]) ?? "other";
      const label = mostCommon(c.labels) ?? KIND_LABEL[kind];
      const place: Place = {
        id: placeId(c.center.lat, c.center.lng),
        label,
        kind,
        lat: c.center.lat,
        lng: c.center.lng,
        frequency: c.count,
      };
      return place;
    });

  places.sort((a, b) =>
    b.frequency !== a.frequency
      ? b.frequency - a.frequency
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0,
  );
  return places;
}

function mostCommon(counts: Record<string, number>): string | undefined {
  let best: string | undefined;
  let bestN = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN || (n === bestN && best !== undefined && k < best)) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

/**
 * Attach the deterministic "N min from your usual coffee spot" figure: for each
 * place, the walking minutes to the nearest listing. Shared distance math with the
 * negotiation routine-fit scout.
 */
export function withNearestListingMinutes(
  places: Place[],
  listings: { lat: number | null; lng: number | null }[],
): Place[] {
  const pts = listings.filter(
    (l): l is { lat: number; lng: number } => l.lat != null && l.lng != null,
  );
  return places.map((p) => {
    if (pts.length === 0) return p;
    let min = Infinity;
    for (const l of pts) min = Math.min(min, walkingMinutes(p, l));
    return { ...p, nearestListingMinutes: min };
  });
}
