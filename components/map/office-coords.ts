/**
 * Seed office coordinates by company (RA19).
 * Person C will replace this with real Mapbox geocoding when a company name is
 * new. Everything else falls back to a Seattle SLU midpoint so the demo works.
 */
export function officeCoordsForCompany(company: string): { lat: number; lng: number } {
  const key = company.trim().toLowerCase();
  const map: Record<string, { lat: number; lng: number }> = {
    stripe: { lat: 47.6205, lng: -122.3383 },
    anthropic: { lat: 47.6205, lng: -122.3383 }, // Seattle-adjacent placeholder
    meta: { lat: 47.6170, lng: -122.3389 },
    facebook: { lat: 47.6170, lng: -122.3389 },
    google: { lat: 47.6480, lng: -122.3510 },
    amazon: { lat: 47.6144, lng: -122.3369 },
    microsoft: { lat: 47.6396, lng: -122.1287 },
  };
  return map[key] ?? { lat: 47.6205, lng: -122.3383 };
}
