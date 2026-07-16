import "server-only";

import { demoRecurringPlaces } from "@/lib/demo";
import { RoutePoiForbiddenError, validateRoutePoiPlace } from "@/lib/route/pois";
import { createServerSupabase } from "@/lib/supabase/server";
import type { RoutePoi } from "@/lib/types/contract";

/**
 * Authenticated intern Round 1 places boundary. The demo currently uses the
 * preloaded Takeout fixture, but callers still flow through this user-scoped seam
 * so persistence can replace it without changing /api/route/pois.
 */
export async function getAuthenticatedInternRound1Places(
  callerId: string,
): Promise<RoutePoi["place"][]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id,user_type")
    .eq("id", callerId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_type !== "intern") {
    throw new RoutePoiForbiddenError("intern_required");
  }

  return demoRecurringPlaces()
    .map((place) => validateRoutePoiPlace({ ...place, id: `${callerId}:${place.id}` }))
    .filter((place) => place !== null);
}
