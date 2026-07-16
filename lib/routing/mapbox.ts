import { haversineMeters } from "@/lib/places/distance";
import type { RouteResponse, GeoJSONLineString } from "@/lib/types/contract";

/**
 * Mapbox Directions client (RC6). Server-side; the token is read from the environment
 * and never trusted from the client. Returns a driving route office -> apartment with a
 * deterministic STRAIGHT-LINE fallback (haversine distance + estimated duration) when
 * there is no key or the call fails, so the map always draws a route.
 */

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";
const AVG_DRIVE_MPS = 11; // ~25 mph city driving, for the fallback ETA only

export type LatLng = { lat: number; lng: number };

export function mapboxToken(): string | undefined {
  return process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}
export function isMapboxEnabled(): boolean {
  return !!mapboxToken();
}

/** Deterministic straight-line fallback route. */
export function straightLineRoute(office: LatLng, apartment: LatLng): RouteResponse {
  const geometry: GeoJSONLineString = {
    type: "LineString",
    coordinates: [
      [office.lng, office.lat],
      [apartment.lng, apartment.lat],
    ],
  };
  const distanceMeters = Math.round(haversineMeters(office, apartment));
  return { geometry, distanceMeters, durationSeconds: Math.round(distanceMeters / AVG_DRIVE_MPS) };
}

/** Live Mapbox route, or the straight-line fallback. Never throws. */
export async function getRoute(
  office: LatLng,
  apartment: LatLng,
): Promise<{ route: RouteResponse; source: "mapbox" | "fallback" }> {
  const token = mapboxToken();
  if (!token) return { route: straightLineRoute(office, apartment), source: "fallback" };

  try {
    const coords = `${office.lng},${office.lat};${apartment.lng},${apartment.lat}`;
    const url = `${DIRECTIONS_URL}/${coords}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`mapbox directions ${res.status}`);
    const data = (await res.json()) as {
      routes?: { geometry?: GeoJSONLineString; distance?: number; duration?: number }[];
    };
    const r = data.routes?.[0];
    if (!r?.geometry || r.distance == null || r.duration == null) throw new Error("no route in response");
    return {
      route: {
        geometry: r.geometry,
        distanceMeters: Math.round(r.distance),
        durationSeconds: Math.round(r.duration),
      },
      source: "mapbox",
    };
  } catch (err) {
    console.warn("mapbox directions failed, straight-line fallback:", err);
    return { route: straightLineRoute(office, apartment), source: "fallback" };
  }
}
