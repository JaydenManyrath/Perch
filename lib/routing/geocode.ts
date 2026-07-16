import { mapboxToken } from "./mapbox";
import type { LatLng } from "./mapbox";

/**
 * Office geocode (RC7). Derives the office location from the user's employer so the
 * commute route (RC6) has an origin without asking the user for an address. Tries
 * Mapbox Geocoding when keyed; falls back to a seeded per-company coordinate table, then
 * to the Seattle city center. Deterministic fallback; never throws.
 */

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const SEATTLE: LatLng = { lat: 47.6062, lng: -122.3321 };

// Seeded Seattle-area office coordinates for the demo companies.
const COMPANY_COORDS: Record<string, LatLng> = {
  stripe: { lat: 47.6205, lng: -122.3382 }, // SLU
  amazon: { lat: 47.6155, lng: -122.3390 }, // Denny Triangle
  meta: { lat: 47.6226, lng: -122.3373 }, // SLU
  google: { lat: 47.6498, lng: -122.3490 }, // Fremont
  microsoft: { lat: 47.6423, lng: -122.1370 }, // Redmond
  databricks: { lat: 47.6150, lng: -122.3400 },
  figma: { lat: 47.6101, lng: -122.3421 },
  notion: { lat: 47.6062, lng: -122.3321 },
  tableau: { lat: 47.6500, lng: -122.3490 },
  zillow: { lat: 47.6039, lng: -122.3350 },
};

export function seededCompanyCoords(employer: string | null | undefined): LatLng | null {
  if (!employer) return null;
  const key = employer.trim().toLowerCase();
  for (const [name, coords] of Object.entries(COMPANY_COORDS)) {
    if (key === name || key.includes(name)) return coords;
  }
  return null;
}

/** Geocode an employer to office coords. Live Mapbox first, then seeded, then Seattle. */
export async function geocodeEmployer(
  employer: string | null | undefined,
): Promise<{ coords: LatLng; source: "mapbox" | "seeded" | "city" }> {
  const seeded = seededCompanyCoords(employer);
  const token = mapboxToken();

  if (employer && token) {
    try {
      const q = encodeURIComponent(`${employer} office Seattle`);
      const url = `${GEOCODE_URL}/${q}.json?proximity=${SEATTLE.lng},${SEATTLE.lat}&limit=1&access_token=${token}`;
      const res = await fetch(url, { next: { revalidate: 86_400 } });
      if (res.ok) {
        const data = (await res.json()) as { features?: { center?: [number, number] }[] };
        const center = data.features?.[0]?.center;
        if (center) return { coords: { lat: center[1], lng: center[0] }, source: "mapbox" };
      }
    } catch (err) {
      console.warn("mapbox geocode failed, using seeded/city:", err);
    }
  }

  if (seeded) return { coords: seeded, source: "seeded" };
  return { coords: SEATTLE, source: "city" };
}
