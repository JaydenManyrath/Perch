import { mapboxToken } from "@/lib/routing/mapbox";
import type { IngestCity } from "./ingest";

/**
 * Viewer-area resolution for the events feed. "The area" is the city the intern
 * selected in onboarding (users.city, parsed from the offer letter). The feed uses it
 * two ways: to cooldown-refresh Ticketmaster events for THAT city, and to filter the
 * events it serves to that area.
 *
 * Resolution order (deterministic-first, per the house rule):
 *   1. KNOWN_CITIES table lookup (case-insensitive, substring both ways so
 *      "Seattle, WA" and "seattle" both hit).
 *   2. Mapbox geocoding, only when a token is present (same seam as RC7's
 *      employer geocode). Never throws; any failure falls through.
 *   3. Seattle - the demo cohort's city and the seeded default.
 */

export const DEFAULT_RADIUS_MILES = 25;

const KNOWN_CITIES: IngestCity[] = [
  { name: "Seattle", lat: 47.6062, lng: -122.3321, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "New York", lat: 40.7128, lng: -74.006, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Austin", lat: 30.2672, lng: -97.7431, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Chicago", lat: 41.8781, lng: -87.6298, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Boston", lat: 42.3601, lng: -71.0589, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Denver", lat: 39.7392, lng: -104.9903, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Atlanta", lat: 33.749, lng: -84.388, radiusMiles: DEFAULT_RADIUS_MILES },
  { name: "Washington", lat: 38.9072, lng: -77.0369, radiusMiles: DEFAULT_RADIUS_MILES },
];

export const DEFAULT_AREA: IngestCity = KNOWN_CITIES[0];

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

/** Table-only lookup; exported for tests and for callers that must stay sync. */
export function knownCityArea(city: string | null | undefined): IngestCity | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  if (!key) return null;
  for (const known of KNOWN_CITIES) {
    const name = known.name.toLowerCase();
    if (key === name || key.includes(name) || name.includes(key)) return known;
  }
  return null;
}

/** Resolve a viewer's city to an event area. Never throws, never returns null. */
export async function resolveEventArea(city: string | null | undefined): Promise<IngestCity> {
  const known = knownCityArea(city);
  if (known) return known;

  const token = mapboxToken();
  if (city && token) {
    try {
      const url = `${GEOCODE_URL}/${encodeURIComponent(city)}.json?types=place&limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { features?: Array<{ center?: [number, number]; text?: string }> };
        const feature = json.features?.[0];
        if (feature?.center && feature.center.length === 2) {
          return {
            name: feature.text ?? city,
            lat: feature.center[1],
            lng: feature.center[0],
            radiusMiles: DEFAULT_RADIUS_MILES,
          };
        }
      }
    } catch {
      // fall through to the default - the feed must never break on a geocode hiccup
    }
  }
  return DEFAULT_AREA;
}
