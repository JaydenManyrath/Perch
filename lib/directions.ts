import type { RouteResponse } from "@/lib/types/contract";
import { env } from "@/lib/env";

/**
 * Client-side Mapbox Directions call.
 *
 * The Mapbox public token (NEXT_PUBLIC_MAPBOX_TOKEN) allows Directions API
 * calls from the browser. This is our "smart routing" tier: real road-
 * following routes with realistic distance + duration, rather than a
 * straight-line Haversine.
 *
 * Person C is still on the hook for RC6 - the SERVER route (POST /api/route)
 * with rate-limiting + fallback + shared cache. Until that ships, this
 * client-side path makes the commute route look like Google Maps.
 */
export async function fetchMapboxDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: "walking" | "driving" | "cycling" = "walking",
): Promise<RouteResponse | null> {
  if (typeof window === "undefined") return null;
  if (!env.mapbox.token) return null;
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?access_token=${encodeURIComponent(env.mapbox.token)}` +
    `&geometries=geojson&overview=full`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;
    return {
      geometry: {
        type: "LineString",
        coordinates: route.geometry.coordinates as [number, number][],
      },
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.round(route.duration ?? 0),
    };
  } catch {
    return null;
  }
}
