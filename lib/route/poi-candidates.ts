import "server-only";

import type { RoutePoi, RoutePoiSearchInput } from "@/lib/types/contract";

/**
 * Frozen Person C server-module seam. Person C owns external POI search and any
 * Mapbox calls; Person B's route only calls this function with geometry + kinds.
 */
export async function searchRoutePoiCandidates(
  _input: RoutePoiSearchInput,
): Promise<RoutePoi["place"][]> {
  return [];
}
