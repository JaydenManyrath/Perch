import type {
  GeoJSONLineString,
  RoutePoi,
  RoutePoiKind,
  RoutePoiSearchInput,
} from "@/lib/types/contract";

export const ROUTE_POI_KINDS = ["coffee", "gym"] as const;
export const ROUTE_CORRIDOR_METERS = 250;

type RoutePoiPlace = RoutePoi["place"];

export type RoutePoiProvider = (input: RoutePoiSearchInput) => Promise<RoutePoiPlace[]>;

export type BuildRoutePoisOptions = {
  geometry: GeoJSONLineString;
  kinds: RoutePoiKind[];
  userPlaces: RoutePoiPlace[];
  searchCandidates: RoutePoiProvider;
  corridorMeters?: number;
};

export class RoutePoiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutePoiInputError";
  }
}

export class RoutePoiForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutePoiForbiddenError";
  }
}

export function parseRoutePoisInput(body: unknown): RoutePoiSearchInput {
  if (!body || typeof body !== "object") {
    throw new RoutePoiInputError("body_required");
  }
  const obj = body as { geometry?: unknown; kinds?: unknown };
  const geometry = validateLineString(obj.geometry);
  const kinds = validateKinds(obj.kinds);
  return { geometry, kinds };
}

export async function buildRoutePois({
  geometry,
  kinds,
  userPlaces,
  searchCandidates,
  corridorMeters = ROUTE_CORRIDOR_METERS,
}: BuildRoutePoisOptions): Promise<RoutePoi[]> {
  const candidates = await searchCandidates({ geometry, kinds });
  const merged = dedupePlaces([...userPlaces, ...candidates]).filter((place) =>
    kinds.some((kind) => kind === place.kind),
  );

  return merged
    .map((place) => ({
      place,
      distanceFromRouteMeters: Math.round(distancePointToLineStringMeters(place, geometry)),
    }))
    .filter((poi) => poi.distanceFromRouteMeters <= corridorMeters)
    .sort((a, b) => {
      const byDistance = a.distanceFromRouteMeters - b.distanceFromRouteMeters;
      if (byDistance !== 0) return byDistance;
      return stablePlaceKey(a.place).localeCompare(stablePlaceKey(b.place));
    });
}

export function distancePointToLineStringMeters(point: { lat: number; lng: number }, line: GeoJSONLineString): number {
  const originLat = point.lat;
  const p = project(point.lng, point.lat, originLat);
  let best = Number.POSITIVE_INFINITY;

  for (let i = 1; i < line.coordinates.length; i += 1) {
    const [aLng, aLat] = line.coordinates[i - 1];
    const [bLng, bLat] = line.coordinates[i];
    const a = project(aLng, aLat, originLat);
    const b = project(bLng, bLat, originLat);
    best = Math.min(best, distancePointToSegment(p, a, b));
  }

  return best;
}

export function validateRoutePoiPlace(value: unknown): RoutePoiPlace | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<RoutePoiPlace>;
  if (typeof p.id !== "string" || p.id.length === 0) return null;
  if (typeof p.label !== "string" || p.label.length === 0) return null;
  if (!isAllowedKind(p.kind)) return null;
  if (!validLatitude(p.lat) || !validLongitude(p.lng)) return null;
  return { id: p.id, label: p.label, kind: p.kind, lat: p.lat, lng: p.lng };
}

function validateLineString(value: unknown): GeoJSONLineString {
  if (!value || typeof value !== "object") throw new RoutePoiInputError("invalid_geometry");
  const g = value as Partial<GeoJSONLineString>;
  if (g.type !== "LineString" || !Array.isArray(g.coordinates) || g.coordinates.length < 2) {
    throw new RoutePoiInputError("invalid_geometry");
  }

  const coordinates = g.coordinates.map((coord) => {
    if (
      !Array.isArray(coord)
      || coord.length !== 2
      || !validLongitude(coord[0])
      || !validLatitude(coord[1])
    ) {
      throw new RoutePoiInputError("invalid_coordinates");
    }
    return [coord[0], coord[1]] as [number, number];
  });

  return { type: "LineString", coordinates };
}

function validateKinds(value: unknown): RoutePoiKind[] {
  if (!Array.isArray(value) || value.length === 0) throw new RoutePoiInputError("invalid_kinds");
  const kinds = [...new Set(value)];
  if (!kinds.every(isAllowedKind)) throw new RoutePoiInputError("invalid_kinds");
  return kinds as RoutePoiKind[];
}

function dedupePlaces(places: RoutePoiPlace[]): RoutePoiPlace[] {
  const byKey = new Map<string, RoutePoiPlace>();
  for (const raw of places) {
    const place = validateRoutePoiPlace(raw);
    if (!place) continue;
    const key = stablePlaceIdentity(place);
    if (!byKey.has(key)) byKey.set(key, place);
  }
  return [...byKey.values()];
}

function stablePlaceIdentity(place: RoutePoiPlace): string {
  if (place.id) return `id:${place.id}`;
  return `geo:${place.kind}:${place.lat.toFixed(6)}:${place.lng.toFixed(6)}:${place.label.toLowerCase()}`;
}

function stablePlaceKey(place: RoutePoiPlace): string {
  return `${place.kind}:${place.label.toLowerCase()}:${place.id}`;
}

function isAllowedKind(value: unknown): value is RoutePoiKind {
  return typeof value === "string" && ROUTE_POI_KINDS.includes(value as (typeof ROUTE_POI_KINDS)[number]);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validLatitude(value: unknown): value is number {
  return finiteNumber(value) && value >= -90 && value <= 90;
}

function validLongitude(value: unknown): value is number {
  return finiteNumber(value) && value >= -180 && value <= 180;
}

function project(lng: number, lat: number, originLat: number) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((originLat * Math.PI) / 180);
  return { x: lng * metersPerDegreeLng, y: lat * metersPerDegreeLat };
}

function distancePointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
